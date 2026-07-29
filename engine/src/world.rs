use std::f32::consts::{PI, TAU};

use crate::{
    MAX_ENTITIES, SLIDE_HEIGHT_UM, SLIDE_WIDTH_UM,
    entities::{Entities, EntityKind},
    field::{CUE, Fields, GLUCOSE},
    rng::Rng,
    spatial::SpatialBins,
};

pub const SNAPSHOT_STRIDE: usize = 12;
pub const METRICS_LEN: usize = 16;
pub const CONNECTION_STRIDE: usize = 4;

const MICROBE_DT_SECONDS: f32 = 0.05;
const NEURAL_DT_SECONDS: f32 = 0.001;
const GLUCOSE_MOLAR_MASS_G_MOL: f32 = 180.156;
const BIOMASS_YIELD_G_G: f32 = 0.5;
const BACTERIAL_MU_MAX_PER_S: f32 = std::f32::consts::LN_2 / 1_200.0;
const BACTERIAL_KS_MM: f32 = 0.05;
const BACTERIAL_SPEED_UM_S: f32 = 15.0;
const CUE_SECRETION_NM_EQ_S: f32 = 0.02;
const PHAGOCYTE_SPEED_UM_S: f32 = 0.20;
const PHAGOCYTE_CAPACITY: f32 = 6.0;
const ENGULFMENT_SECONDS: f32 = 15.0;
const MAX_NEURAL_EVENTS: usize = 4_096;

pub const STATUS_OK: u32 = 0;
pub const STATUS_INVALID: u32 = 1;
pub const STATUS_INCOMPATIBLE: u32 = 2;
pub const STATUS_CAPACITY: u32 = 3;
pub const STATUS_BACKLOG_DROPPED: u32 = 4;

#[repr(u32)]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Preset {
    Blank = 0,
    HostMicrobe = 1,
    Pursuit = 2,
    Cortical = 3,
}

impl Preset {
    pub fn from_u32(value: u32) -> Option<Self> {
        match value {
            0 => Some(Self::Blank),
            1 => Some(Self::HostMicrobe),
            2 => Some(Self::Pursuit),
            3 => Some(Self::Cortical),
            _ => None,
        }
    }

    fn accepts(self, kind: EntityKind) -> bool {
        match self {
            Self::Cortical => matches!(
                kind,
                EntityKind::NeuronExcitatory | EntityKind::NeuronInhibitory
            ),
            Self::Blank | Self::HostMicrobe | Self::Pursuit => matches!(
                kind,
                EntityKind::Bacterium | EntityKind::Phagocyte | EntityKind::Epithelium
            ),
        }
    }
}

#[derive(Clone, Copy, Debug)]
pub struct Connection {
    source: u32,
    target: u32,
    conductance_ns: f32,
    delay_seconds: f32,
}

#[derive(Clone, Copy, Debug)]
struct SynapticEvent {
    delivery_seconds: f32,
    target: u32,
    conductance_ns: f32,
}

#[derive(Clone, Debug, Default)]
pub struct Counters {
    pub divisions: u32,
    pub engulfments: u32,
    pub spikes: u32,
    pub slow_frames: u32,
}

/// Complete deterministic state for one model chassis.
pub struct World {
    pub preset: Preset,
    pub seed: u64,
    pub time_seconds: f32,
    accumulator_seconds: f32,
    pub entities: Entities,
    pub fields: Fields,
    spatial: SpatialBins,
    rng: Rng,
    connections: Vec<Connection>,
    events: Vec<SynapticEvent>,
    pending_remove: Vec<usize>,
    pub counters: Counters,
    pub last_status: u32,
    pub snapshot: Vec<f32>,
    pub metrics: Vec<f32>,
    pub connection_snapshot: Vec<f32>,
}

impl World {
    pub fn new(seed: u64, preset: Preset) -> Self {
        let initial_glucose = match preset {
            Preset::Blank => 0.15,
            Preset::HostMicrobe => 0.30,
            Preset::Pursuit => 0.10,
            Preset::Cortical => 0.0,
        };
        let mut world = Self {
            preset,
            seed,
            time_seconds: 0.0,
            accumulator_seconds: 0.0,
            entities: Entities::new(MAX_ENTITIES),
            fields: Fields::new(initial_glucose),
            spatial: SpatialBins::new(MAX_ENTITIES),
            rng: Rng::new(seed),
            connections: Vec::with_capacity(512),
            events: Vec::with_capacity(MAX_NEURAL_EVENTS),
            pending_remove: Vec::with_capacity(128),
            counters: Counters::default(),
            last_status: STATUS_OK,
            snapshot: Vec::with_capacity(MAX_ENTITIES * SNAPSHOT_STRIDE),
            metrics: vec![0.0; METRICS_LEN],
            connection_snapshot: Vec::with_capacity(512 * CONNECTION_STRIDE),
        };
        world.populate_preset();
        world
    }

    pub fn reset(&mut self, seed: u64, preset: Preset) {
        *self = Self::new(seed, preset);
    }

    fn populate_preset(&mut self) {
        match self.preset {
            Preset::Blank => {}
            Preset::HostMicrobe => {
                self.fields
                    .deposit_disc(GLUCOSE, 150.0, 125.0, 70.0, 1.8);
                self.fields.step(MICROBE_DT_SECONDS);
                for column in 0..12 {
                    self.spawn_epithelium(28.0 + column as f32 * 31.0, 238.0);
                }
                for _ in 0..26 {
                    let x = self.rng.range(72.0, 172.0);
                    let y = self.rng.range(55.0, 180.0);
                    self.spawn_bacterium(x, y);
                }
                self.spawn_phagocyte(310.0, 75.0);
                self.spawn_phagocyte(340.0, 160.0);
                self.spawn_phagocyte(280.0, 205.0);
            }
            Preset::Pursuit => {
                for _ in 0..34 {
                    let angle = self.rng.range(0.0, TAU);
                    let distance = self.rng.range(8.0, 48.0);
                    self.spawn_bacterium(
                        205.0 + angle.cos() * distance,
                        130.0 + angle.sin() * distance,
                    );
                }
                for (x, y) in [(45.0, 45.0), (355.0, 45.0), (45.0, 215.0), (355.0, 215.0)]
                {
                    self.spawn_phagocyte(x, y);
                }
            }
            Preset::Cortical => self.populate_cortical(),
        }
        self.refresh_connection_snapshot();
        self.prepare_snapshot();
    }

    fn populate_cortical(&mut self) {
        let count = 40;
        for index in 0..count {
            let kind = if index < 32 {
                EntityKind::NeuronExcitatory
            } else {
                EntityKind::NeuronInhibitory
            };
            let column = index % 8;
            let row = index / 8;
            let x = 34.0 + column as f32 * 47.0 + self.rng.range(-9.0, 9.0);
            let y = 28.0 + row as f32 * 50.0 + self.rng.range(-8.0, 8.0);
            self.spawn_neuron(kind, x, y);
        }

        let ids = self.entities.ids.clone();
        for source_index in 0..ids.len() {
            let source_id = ids[source_index];
            let source_kind = self.entities.kinds[source_index];
            let outgoing = if source_kind == EntityKind::NeuronExcitatory {
                4
            } else {
                5
            };
            let mut used = Vec::with_capacity(outgoing);
            for _ in 0..outgoing {
                let mut best = None;
                for _ in 0..12 {
                    let target_index = self.rng.usize(ids.len());
                    if target_index == source_index || used.contains(&target_index) {
                        continue;
                    }
                    let dx = self.entities.x[target_index] - self.entities.x[source_index];
                    let dy = self.entities.y[target_index] - self.entities.y[source_index];
                    let distance = (dx * dx + dy * dy).sqrt();
                    let score = distance * self.rng.range(0.7, 1.5);
                    if best.is_none_or(|(_, best_score)| score < best_score) {
                        best = Some((target_index, score));
                    }
                }
                if let Some((target_index, _)) = best {
                    used.push(target_index);
                    self.connections.push(Connection {
                        source: source_id,
                        target: ids[target_index],
                        conductance_ns: if source_kind == EntityKind::NeuronExcitatory {
                            self.rng.range(0.7, 1.5)
                        } else {
                            -self.rng.range(2.0, 3.5)
                        },
                        delay_seconds: self.rng.range(0.002, 0.009),
                    });
                }
            }
        }
    }

    fn spawn_bacterium(&mut self, x: f32, y: f32) -> Option<u32> {
        let id = self.entities.push(
            EntityKind::Bacterium,
            x.clamp(2.0, SLIDE_WIDTH_UM - 2.0),
            y.clamp(2.0, SLIDE_HEIGHT_UM - 2.0),
            self.rng.range(0.0, TAU),
            1.5,
        )?;
        let index = self.entities.len() - 1;
        let glucose = self.fields.sample(GLUCOSE, x, y);
        self.entities.a[index] = self.rng.range(0.30, 0.56);
        self.entities.b[index] = glucose;
        self.entities.c[index] = glucose;
        self.entities.e[index] = 0.60;
        Some(id)
    }

    fn spawn_phagocyte(&mut self, x: f32, y: f32) -> Option<u32> {
        let id = self.entities.push(
            EntityKind::Phagocyte,
            x.clamp(8.0, SLIDE_WIDTH_UM - 8.0),
            y.clamp(8.0, SLIDE_HEIGHT_UM - 8.0),
            self.rng.range(0.0, TAU),
            7.0,
        )?;
        let index = self.entities.len() - 1;
        self.entities.c[index] = self.fields.sample(CUE, x, y);
        Some(id)
    }

    fn spawn_epithelium(&mut self, x: f32, y: f32) -> Option<u32> {
        self.entities.push(
            EntityKind::Epithelium,
            x.clamp(12.0, SLIDE_WIDTH_UM - 12.0),
            y.clamp(12.0, SLIDE_HEIGHT_UM - 12.0),
            self.rng.range(-0.18, 0.18),
            11.0,
        )
    }

    fn spawn_neuron(&mut self, kind: EntityKind, x: f32, y: f32) -> Option<u32> {
        let id = self.entities.push(
            kind,
            x.clamp(6.0, SLIDE_WIDTH_UM - 6.0),
            y.clamp(6.0, SLIDE_HEIGHT_UM - 6.0),
            self.rng.range(0.0, TAU),
            self.rng.range(4.2, 5.7),
        )?;
        let index = self.entities.len() - 1;
        self.entities.a[index] = self.rng.range(-68.0, -62.0);
        self.entities.f[index] = 0.0;
        Some(id)
    }

    pub fn place_entity(&mut self, kind: EntityKind, x: f32, y: f32) -> u32 {
        if !x.is_finite() || !y.is_finite() {
            self.last_status = STATUS_INVALID;
            return 0;
        }
        if !self.preset.accepts(kind) {
            self.last_status = STATUS_INCOMPATIBLE;
            return 0;
        }
        let placed = match kind {
            EntityKind::Bacterium => self.spawn_bacterium(x, y),
            EntityKind::Phagocyte => self.spawn_phagocyte(x, y),
            EntityKind::Epithelium => self.spawn_epithelium(x, y),
            EntityKind::NeuronExcitatory | EntityKind::NeuronInhibitory => {
                self.spawn_neuron(kind, x, y)
            }
        };
        match placed {
            Some(id) => {
                self.last_status = STATUS_OK;
                if matches!(
                    kind,
                    EntityKind::NeuronExcitatory | EntityKind::NeuronInhibitory
                ) {
                    self.connect_new_neuron(id, kind);
                }
                id
            }
            None => {
                self.last_status = STATUS_CAPACITY;
                0
            }
        }
    }

    fn connect_new_neuron(&mut self, id: u32, kind: EntityKind) {
        let Some(source_index) = self.entities.index_of(id) else {
            return;
        };
        let mut candidates = (0..self.entities.len())
            .filter(|index| *index != source_index)
            .map(|index| {
                let dx = self.entities.x[index] - self.entities.x[source_index];
                let dy = self.entities.y[index] - self.entities.y[source_index];
                (index, dx * dx + dy * dy)
            })
            .collect::<Vec<_>>();
        candidates.sort_by(|left, right| left.1.total_cmp(&right.1));
        for (target_index, _) in candidates.into_iter().take(4) {
            self.connections.push(Connection {
                source: id,
                target: self.entities.ids[target_index],
                conductance_ns: if kind == EntityKind::NeuronExcitatory {
                    1.0
                } else {
                    -2.5
                },
                delay_seconds: 0.005,
            });
        }
        self.refresh_connection_snapshot();
    }

    pub fn deposit_field(
        &mut self,
        channel: usize,
        x: f32,
        y: f32,
        radius_um: f32,
        amount: f32,
    ) -> bool {
        if self.preset == Preset::Cortical {
            self.last_status = STATUS_INCOMPATIBLE;
            return false;
        }
        if channel > CUE
            || !x.is_finite()
            || !y.is_finite()
            || !radius_um.is_finite()
            || !amount.is_finite()
            || radius_um <= 0.0
            || amount <= 0.0
        {
            self.last_status = STATUS_INVALID;
            return false;
        }
        self.fields.deposit_disc(
            channel,
            x.clamp(0.0, SLIDE_WIDTH_UM),
            y.clamp(0.0, SLIDE_HEIGHT_UM),
            radius_um.clamp(2.0, 80.0),
            amount,
        );
        self.last_status = STATUS_OK;
        true
    }

    pub fn advance(&mut self, requested_seconds: f32) -> u32 {
        if !requested_seconds.is_finite() || requested_seconds < 0.0 {
            self.last_status = STATUS_INVALID;
            return 0;
        }
        let (dt, max_steps) = if self.preset == Preset::Cortical {
            (NEURAL_DT_SECONDS, 1_000_u32)
        } else {
            (MICROBE_DT_SECONDS, 1_000_u32)
        };
        self.accumulator_seconds += requested_seconds.min(120.0);
        let requested_steps = (self.accumulator_seconds / dt).floor() as u32;
        let steps = requested_steps.min(max_steps);
        if requested_steps > max_steps {
            self.accumulator_seconds = 0.0;
            self.counters.slow_frames = self.counters.slow_frames.saturating_add(1);
            self.last_status = STATUS_BACKLOG_DROPPED;
        } else {
            self.accumulator_seconds -= steps as f32 * dt;
            self.last_status = STATUS_OK;
        }

        for _ in 0..steps {
            if self.preset == Preset::Cortical {
                self.step_neural(NEURAL_DT_SECONDS);
            } else {
                self.step_microbe(MICROBE_DT_SECONDS);
            }
        }
        steps
    }

    fn step_microbe(&mut self, dt: f32) {
        self.spatial.rebuild(&self.entities);
        self.pending_remove.clear();
        let initial_len = self.entities.len();
        let mut children = Vec::new();
        let mut claimed = Vec::<u32>::new();
        let captured = (0..initial_len)
            .filter(|index| self.entities.kinds[*index] == EntityKind::Phagocyte)
            .map(|index| self.entities.target[index])
            .filter(|target| *target != 0)
            .collect::<Vec<_>>();

        for index in 0..initial_len {
            match self.entities.kinds[index] {
                EntityKind::Bacterium => {
                    self.step_bacterium(index, dt, &captured, &mut children)
                }
                EntityKind::Phagocyte => {
                    self.step_phagocyte(index, dt, &mut claimed);
                }
                EntityKind::Epithelium => self.step_epithelium(index, dt),
                EntityKind::NeuronExcitatory | EntityKind::NeuronInhibitory => {}
            }
        }

        self.entities.remove_indices(&mut self.pending_remove);
        for (x, y, angle, biomass) in children {
            if let Some(id) = self.spawn_bacterium(x, y)
                && let Some(index) = self.entities.index_of(id)
            {
                self.entities.angle[index] = angle;
                self.entities.a[index] = biomass;
            }
        }
        self.fields.step(dt);
        self.time_seconds += dt;
    }

    fn step_bacterium(
        &mut self,
        index: usize,
        dt: f32,
        captured: &[u32],
        children: &mut Vec<(f32, f32, f32, f32)>,
    ) {
        let x = self.entities.x[index];
        let y = self.entities.y[index];
        let glucose = self.fields.sample(GLUCOSE, x, y);

        self.entities.b[index] += (glucose - self.entities.b[index]) * dt / 0.8;
        self.entities.c[index] += (glucose - self.entities.c[index]) * dt / 4.0;
        let temporal_signal = self.entities.b[index] - self.entities.c[index];
        let tumble_rate = (-3.0 * temporal_signal).exp().clamp(0.08, 4.0);
        let tumble_probability = 1.0 - (-tumble_rate * dt).exp();
        if self.rng.f32() < tumble_probability {
            self.entities.angle[index] = self.rng.range(0.0, TAU);
        }

        if !captured.contains(&self.entities.ids[index]) {
            self.entities.x[index] +=
                self.entities.angle[index].cos() * BACTERIAL_SPEED_UM_S * dt;
            self.entities.y[index] +=
                self.entities.angle[index].sin() * BACTERIAL_SPEED_UM_S * dt;
            reflect(
                &mut self.entities.x[index],
                &mut self.entities.angle[index],
                1.5,
                SLIDE_WIDTH_UM,
                true,
            );
            reflect(
                &mut self.entities.y[index],
                &mut self.entities.angle[index],
                1.5,
                SLIDE_HEIGHT_UM,
                false,
            );
        }

        let saturation = glucose / (BACTERIAL_KS_MM + glucose.max(0.0));
        let desired_growth = self.entities.a[index] * BACTERIAL_MU_MAX_PER_S * saturation * dt;
        let glucose_pg_per_mm =
            Fields::voxel_volume_liters() * 1.0e-3 * GLUCOSE_MOLAR_MASS_G_MOL * 1.0e12;
        let desired_glucose_mm = desired_growth / BIOMASS_YIELD_G_G / glucose_pg_per_mm;
        let consumed_mm = desired_glucose_mm.min(glucose);
        let actual_growth = consumed_mm * glucose_pg_per_mm * BIOMASS_YIELD_G_G;
        self.entities.a[index] += actual_growth;
        self.entities.d[index] = BACTERIAL_MU_MAX_PER_S * saturation * 3_600.0;
        self.fields.add_local(GLUCOSE, x, y, -consumed_mm);
        self.fields
            .add_local(CUE, x, y, CUE_SECRETION_NM_EQ_S * dt);

        if self.entities.a[index] >= self.entities.e[index]
            && self.entities.len() + children.len() < MAX_ENTITIES
        {
            let child_biomass = self.entities.a[index] * 0.5;
            self.entities.a[index] = child_biomass;
            let child_angle = (self.entities.angle[index] + PI).rem_euclid(TAU);
            children.push((
                (self.entities.x[index] + child_angle.cos() * 2.4)
                    .clamp(2.0, SLIDE_WIDTH_UM - 2.0),
                (self.entities.y[index] + child_angle.sin() * 2.4)
                    .clamp(2.0, SLIDE_HEIGHT_UM - 2.0),
                child_angle,
                child_biomass,
            ));
            self.counters.divisions = self.counters.divisions.saturating_add(1);
        }
    }

    fn step_phagocyte(&mut self, index: usize, dt: f32, claimed: &mut Vec<u32>) {
        let x = self.entities.x[index];
        let y = self.entities.y[index];
        let (gx, gy) = self.fields.gradient(CUE, x, y);
        let local_cue = self.fields.sample(CUE, x, y);
        self.entities.c[index] = local_cue;

        let mut contact: Option<(usize, f32)> = None;
        self.spatial.for_each_near(x, y, 13.0, |candidate| {
            if candidate == index
                || self.entities.kinds[candidate] != EntityKind::Bacterium
                || claimed.contains(&self.entities.ids[candidate])
            {
                return;
            }
            let dx = self.entities.x[candidate] - x;
            let dy = self.entities.y[candidate] - y;
            let distance2 = dx * dx + dy * dy;
            if distance2 <= 11.0_f32.powi(2)
                && contact.is_none_or(|(_, best)| distance2 < best)
            {
                contact = Some((candidate, distance2));
            }
        });

        if self.entities.a[index] < PHAGOCYTE_CAPACITY
            && let Some((target_index, _)) = contact
        {
            let target_id = self.entities.ids[target_index];
            if self.entities.target[index] != target_id {
                self.entities.target[index] = target_id;
                self.entities.b[index] = 0.0;
            }
            self.entities.b[index] += dt / ENGULFMENT_SECONDS;
            let target_angle = (self.entities.y[target_index] - y)
                .atan2(self.entities.x[target_index] - x);
            self.entities.angle[index] =
                turn_toward(self.entities.angle[index], target_angle, (dt / 1.5).min(1.0));

            if self.entities.b[index] >= 1.0 {
                claimed.push(target_id);
                self.pending_remove.push(target_index);
                self.entities.a[index] += 1.0;
                self.entities.b[index] = 0.0;
                self.entities.d[index] = 120.0;
                self.entities.target[index] = 0;
                self.counters.engulfments = self.counters.engulfments.saturating_add(1);
            }
        } else {
            self.entities.target[index] = 0;
            self.entities.b[index] = (self.entities.b[index] - dt / 5.0).max(0.0);
            let gradient_strength = (gx * gx + gy * gy).sqrt();
            let desired = if gradient_strength > 1.0e-6 {
                gy.atan2(gx)
            } else {
                self.entities.angle[index]
            };
            let bias = (gradient_strength * 80.0).clamp(0.0, 1.0);
            let turn = (dt / 3.0).min(1.0) * (0.2 + 0.8 * bias);
            self.entities.angle[index] =
                turn_toward(self.entities.angle[index], desired, turn)
                    + self.rng.signed() * 0.12 * dt.sqrt();
        }

        if self.entities.d[index] > 0.0 {
            self.entities.d[index] = (self.entities.d[index] - dt).max(0.0);
        }

        let speed = if self.entities.target[index] == 0 {
            PHAGOCYTE_SPEED_UM_S
        } else {
            PHAGOCYTE_SPEED_UM_S * 0.2
        };
        self.entities.x[index] += self.entities.angle[index].cos() * speed * dt;
        self.entities.y[index] += self.entities.angle[index].sin() * speed * dt;
        reflect(
            &mut self.entities.x[index],
            &mut self.entities.angle[index],
            8.0,
            SLIDE_WIDTH_UM,
            true,
        );
        reflect(
            &mut self.entities.y[index],
            &mut self.entities.angle[index],
            8.0,
            SLIDE_HEIGHT_UM,
            false,
        );
    }

    fn step_epithelium(&mut self, index: usize, dt: f32) {
        let x = self.entities.x[index];
        let y = self.entities.y[index];
        let mut burden = 0_u32;
        self.spatial.for_each_near(x, y, 26.0, |candidate| {
            if self.entities.kinds[candidate] != EntityKind::Bacterium {
                return;
            }
            let dx = self.entities.x[candidate] - x;
            let dy = self.entities.y[candidate] - y;
            if dx * dx + dy * dy <= 26.0_f32.powi(2) {
                burden += 1;
            }
        });
        let target = (burden as f32 / 5.0).clamp(0.0, 1.0);
        let tau = if target > self.entities.a[index] {
            120.0
        } else {
            300.0
        };
        self.entities.a[index] =
            (self.entities.a[index] + (target - self.entities.a[index]) * dt / tau)
                .clamp(0.0, 1.0);
        self.entities.b[index] = burden as f32;
        if self.entities.a[index] > 0.25 {
            let emission = (self.entities.a[index] - 0.25) * 0.08 * dt;
            self.fields.add_local(CUE, x, y, emission);
        }
        self.entities.c[index] = self.fields.sample(CUE, x, y);
    }

    fn step_neural(&mut self, dt: f32) {
        let delivery_cutoff = self.time_seconds + dt;
        let mut due = Vec::new();
        self.events.retain(|event| {
            if event.delivery_seconds <= delivery_cutoff {
                due.push(*event);
                false
            } else {
                true
            }
        });
        for event in due {
            if let Some(index) = self.entities.index_of(event.target) {
                if event.conductance_ns >= 0.0 {
                    self.entities.c[index] += event.conductance_ns;
                } else {
                    self.entities.d[index] += -event.conductance_ns;
                }
            }
        }

        let mut spiked = Vec::new();
        for index in 0..self.entities.len() {
            if !matches!(
                self.entities.kinds[index],
                EntityKind::NeuronExcitatory | EntityKind::NeuronInhibitory
            ) {
                continue;
            }

            self.entities.c[index] *= (-dt / 0.005).exp();
            self.entities.d[index] *= (-dt / 0.010).exp();
            self.entities.b[index] *= (-dt / 0.45).exp();
            self.entities.e[index] *= (-dt / 0.008).exp();

            if self.time_seconds < self.entities.f[index] {
                self.entities.a[index] = -68.0;
                continue;
            }

            let id = self.entities.ids[index];
            let tonic_pa = if id % 13 == 0 {
                165.0
            } else if self.entities.kinds[index] == EntityKind::NeuronInhibitory {
                82.0
            } else {
                68.0 + (id % 7) as f32 * 3.5
            };
            let noise_pa = self.rng.signed() * 42.0;
            let voltage = self.entities.a[index];
            let capacitance_pf = 200.0;
            let dv_dt = (-65.0 - voltage) / 0.020
                + (tonic_pa + noise_pa + self.entities.e[index]) / capacitance_pf * 1_000.0
                + self.entities.c[index] * (0.0 - voltage) / capacitance_pf * 1_000.0
                + self.entities.d[index] * (-80.0 - voltage) / capacitance_pf * 1_000.0;
            self.entities.a[index] += dv_dt * dt;

            if self.entities.a[index] >= -50.0 {
                self.entities.a[index] = -68.0;
                self.entities.b[index] = (self.entities.b[index] + 1.0).min(3.0);
                self.entities.f[index] = self.time_seconds + 0.004;
                spiked.push(id);
                self.counters.spikes = self.counters.spikes.saturating_add(1);
            }
        }

        for source in spiked {
            for connection in self
                .connections
                .iter()
                .filter(|connection| connection.source == source)
            {
                if self.events.len() >= MAX_NEURAL_EVENTS {
                    self.last_status = STATUS_CAPACITY;
                    break;
                }
                self.events.push(SynapticEvent {
                    delivery_seconds: self.time_seconds + connection.delay_seconds,
                    target: connection.target,
                    conductance_ns: connection.conductance_ns,
                });
            }
        }
        self.time_seconds += dt;
    }

    pub fn stimulate(&mut self, x: f32, y: f32, strength: f32) -> u32 {
        if self.preset != Preset::Cortical
            || !x.is_finite()
            || !y.is_finite()
            || !strength.is_finite()
        {
            self.last_status = STATUS_INCOMPATIBLE;
            return 0;
        }
        let id = self.select_at(x, y, 18.0);
        if let Some(index) = self.entities.index_of(id) {
            self.entities.e[index] += 900.0 * strength.clamp(0.1, 2.0);
            self.last_status = STATUS_OK;
            id
        } else {
            self.last_status = STATUS_INVALID;
            0
        }
    }

    pub fn select_at(&self, x: f32, y: f32, radius: f32) -> u32 {
        let mut best = (0_u32, radius.max(0.0).powi(2));
        for index in 0..self.entities.len() {
            let dx = self.entities.x[index] - x;
            let dy = self.entities.y[index] - y;
            let distance2 = dx * dx + dy * dy;
            let hit_radius = radius.max(self.entities.radius[index] + 2.0);
            if distance2 <= hit_radius * hit_radius && distance2 <= best.1 {
                best = (self.entities.ids[index], distance2);
            }
        }
        best.0
    }

    pub fn remove_at(&mut self, x: f32, y: f32, radius: f32) -> u32 {
        let id = self.select_at(x, y, radius);
        let Some(index) = self.entities.index_of(id) else {
            self.last_status = STATUS_INVALID;
            return 0;
        };
        self.pending_remove.clear();
        self.pending_remove.push(index);
        self.entities.remove_indices(&mut self.pending_remove);
        self.connections
            .retain(|connection| connection.source != id && connection.target != id);
        self.events.retain(|event| event.target != id);
        self.refresh_connection_snapshot();
        self.last_status = STATUS_OK;
        id
    }

    pub fn prepare_snapshot(&mut self) {
        self.snapshot.clear();
        for index in 0..self.entities.len() {
            self.snapshot.extend_from_slice(&[
                self.entities.ids[index] as f32,
                self.entities.kinds[index] as u8 as f32,
                self.entities.x[index],
                self.entities.y[index],
                self.entities.radius[index],
                self.entities.angle[index],
                self.entities.a[index],
                self.entities.b[index],
                self.entities.c[index],
                self.entities.d[index],
                self.entities.target[index] as f32,
                0.0,
            ]);
        }
        self.prepare_metrics();
    }

    fn prepare_metrics(&mut self) {
        let mut bacteria = 0_u32;
        let mut phagocytes = 0_u32;
        let mut epithelium = 0_u32;
        let mut neurons = 0_u32;
        let mut biomass = 0.0;
        for index in 0..self.entities.len() {
            match self.entities.kinds[index] {
                EntityKind::Bacterium => {
                    bacteria += 1;
                    biomass += self.entities.a[index];
                }
                EntityKind::Phagocyte => phagocytes += 1,
                EntityKind::Epithelium => epithelium += 1,
                EntityKind::NeuronExcitatory | EntityKind::NeuronInhibitory => neurons += 1,
            }
        }
        let glucose_mass_pg = self.fields.sum(GLUCOSE)
            * Fields::voxel_volume_liters()
            * 1.0e-3
            * GLUCOSE_MOLAR_MASS_G_MOL
            * 1.0e12;
        self.metrics.copy_from_slice(&[
            self.time_seconds,
            self.entities.len() as f32,
            bacteria as f32,
            phagocytes as f32,
            epithelium as f32,
            neurons as f32,
            self.fields.mean(GLUCOSE),
            self.fields.max(CUE),
            biomass,
            self.counters.divisions as f32,
            self.counters.engulfments as f32,
            self.counters.spikes as f32,
            glucose_mass_pg,
            self.counters.slow_frames as f32,
            self.events.len() as f32,
            self.preset as u32 as f32,
        ]);
    }

    fn refresh_connection_snapshot(&mut self) {
        self.connection_snapshot.clear();
        for connection in &self.connections {
            self.connection_snapshot.extend_from_slice(&[
                connection.source as f32,
                connection.target as f32,
                connection.conductance_ns,
                connection.delay_seconds,
            ]);
        }
    }

    pub fn state_hash(&mut self) -> u64 {
        self.prepare_snapshot();
        let mut hash = 0xcbf2_9ce4_8422_2325_u64;
        hash ^= self.seed;
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
        for value in &self.snapshot {
            hash ^= value.to_bits() as u64;
            hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
        }
        for value in &self.fields.values {
            hash ^= value.to_bits() as u64;
            hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
        }
        hash
    }
}

fn turn_toward(current: f32, target: f32, fraction: f32) -> f32 {
    let difference = (target - current + PI).rem_euclid(TAU) - PI;
    (current + difference * fraction).rem_euclid(TAU)
}

fn reflect(
    position: &mut f32,
    angle: &mut f32,
    margin: f32,
    extent: f32,
    horizontal: bool,
) {
    if *position < margin {
        *position = margin + (margin - *position);
        *angle = if horizontal { PI - *angle } else { -*angle };
    } else if *position > extent - margin {
        *position = extent - margin - (*position - (extent - margin));
        *angle = if horizontal { PI - *angle } else { -*angle };
    }
    *angle = angle.rem_euclid(TAU);
}

#[cfg(test)]
mod tests {
    use super::{Preset, STATUS_INCOMPATIBLE, World};
    use crate::{
        entities::EntityKind,
        field::{CUE, GLUCOSE},
    };

    #[test]
    fn same_seed_and_steps_are_deterministic() {
        let mut left = World::new(12345, Preset::HostMicrobe);
        let mut right = World::new(12345, Preset::HostMicrobe);
        left.advance(8.0);
        right.advance(8.0);
        assert_eq!(left.state_hash(), right.state_hash());
    }

    #[test]
    fn bacterial_growth_requires_substrate() {
        let mut world = World::new(9, Preset::Blank);
        world.fields.values.fill(0.0);
        let id = world.place_entity(EntityKind::Bacterium, 200.0, 130.0);
        let index = world.entities.index_of(id).unwrap();
        let biomass = world.entities.a[index];
        world.advance(60.0);
        let index = world.entities.index_of(id).unwrap();
        assert_eq!(world.entities.a[index], biomass);
    }

    #[test]
    fn substrate_is_converted_to_biomass() {
        let mut world = World::new(10, Preset::Blank);
        world.fields.values.fill(2.0);
        let id = world.place_entity(EntityKind::Bacterium, 200.0, 130.0);
        let index = world.entities.index_of(id).unwrap();
        let biomass = world.entities.a[index];
        world.advance(20.0);
        let index = world.entities.index_of(id).unwrap();
        assert!(world.entities.a[index] > biomass);
        assert!(world.fields.mean(GLUCOSE) < 2.0);
    }

    #[test]
    fn engulfment_is_not_collision_deletion() {
        let mut world = World::new(11, Preset::Blank);
        let bacterium = world.place_entity(EntityKind::Bacterium, 200.0, 130.0);
        world.place_entity(EntityKind::Phagocyte, 200.0, 130.0);
        world.advance(1.0);
        assert!(world.entities.index_of(bacterium).is_some());
        world.advance(20.0);
        assert!(world.entities.index_of(bacterium).is_none());
        assert_eq!(world.counters.engulfments, 1);
    }

    #[test]
    fn neural_entities_are_incompatible_with_microbe_chassis() {
        let mut world = World::new(12, Preset::Blank);
        assert_eq!(
            world.place_entity(EntityKind::NeuronExcitatory, 20.0, 20.0),
            0
        );
        assert_eq!(world.last_status, STATUS_INCOMPATIBLE);
    }

    #[test]
    fn field_actions_do_not_cross_channels() {
        let mut world = World::new(13, Preset::Blank);
        let cue_before = world.fields.sum(CUE);
        world.deposit_field(GLUCOSE, 100.0, 100.0, 20.0, 1.0);
        world.advance(0.05);
        assert_eq!(world.fields.sum(CUE), cue_before);
        assert!(world.fields.sum(GLUCOSE) > 0.0);
    }

    #[test]
    fn stimulation_precedes_calcium_response() {
        let mut world = World::new(14, Preset::Cortical);
        let id = world.entities.ids[0];
        let x = world.entities.x[0];
        let y = world.entities.y[0];
        world.stimulate(x, y, 2.0);
        let before_spikes = world.counters.spikes;
        world.advance(0.02);
        let index = world.entities.index_of(id).unwrap();
        assert!(world.counters.spikes > before_spikes);
        assert!(world.entities.b[index] > 0.0);
    }
}
