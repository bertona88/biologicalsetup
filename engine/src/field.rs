use crate::{SLIDE_HEIGHT_UM, SLIDE_WIDTH_UM};

pub const FIELD_WIDTH: usize = 64;
pub const FIELD_HEIGHT: usize = 42;
pub const FIELD_LEN: usize = FIELD_WIDTH * FIELD_HEIGHT;
pub const FIELD_COUNT: usize = 2;
pub const GLUCOSE: usize = 0;
pub const CUE: usize = 1;
pub const EFFECTIVE_DEPTH_UM: f32 = 20.0;

const GLUCOSE_D_UM2_S: f32 = 120.0;
const CUE_D_UM2_S: f32 = 70.0;
const CUE_HALF_LIFE_S: f32 = 20.0;

#[derive(Clone, Debug)]
pub struct Fields {
    pub values: Vec<f32>,
    next: Vec<f32>,
    sources: Vec<f32>,
}

impl Fields {
    pub fn new(glucose_millimolar: f32) -> Self {
        let mut values = vec![0.0; FIELD_COUNT * FIELD_LEN];
        values[..FIELD_LEN].fill(glucose_millimolar.max(0.0));
        Self {
            values,
            next: vec![0.0; FIELD_COUNT * FIELD_LEN],
            sources: vec![0.0; FIELD_COUNT * FIELD_LEN],
        }
    }

    #[inline]
    pub fn dx_um() -> f32 {
        SLIDE_WIDTH_UM / FIELD_WIDTH as f32
    }

    #[inline]
    pub fn dy_um() -> f32 {
        SLIDE_HEIGHT_UM / FIELD_HEIGHT as f32
    }

    pub fn voxel_volume_liters() -> f32 {
        Self::dx_um() * Self::dy_um() * EFFECTIVE_DEPTH_UM * 1.0e-15
    }

    #[inline]
    fn index(channel: usize, ix: usize, iy: usize) -> usize {
        channel * FIELD_LEN + iy * FIELD_WIDTH + ix
    }

    #[inline]
    fn coordinates(x_um: f32, y_um: f32) -> (usize, usize) {
        let ix = ((x_um / Self::dx_um()).floor() as isize)
            .clamp(0, FIELD_WIDTH as isize - 1) as usize;
        let iy = ((y_um / Self::dy_um()).floor() as isize)
            .clamp(0, FIELD_HEIGHT as isize - 1) as usize;
        (ix, iy)
    }

    pub fn cell_at(x_um: f32, y_um: f32) -> usize {
        let (ix, iy) = Self::coordinates(x_um, y_um);
        iy * FIELD_WIDTH + ix
    }

    pub fn sample(&self, channel: usize, x_um: f32, y_um: f32) -> f32 {
        let (ix, iy) = Self::coordinates(x_um, y_um);
        self.values[Self::index(channel, ix, iy)]
    }

    /// Atomically withdraws a concentration increment from one field cell.
    ///
    /// Callers aggregate competing sinks before using this method so the
    /// returned amount is the single source of truth for downstream mass
    /// accounting.
    pub fn consume_cell(&mut self, channel: usize, cell: usize, requested: f32) -> f32 {
        if channel >= FIELD_COUNT
            || cell >= FIELD_LEN
            || !requested.is_finite()
            || requested <= 0.0
        {
            return 0.0;
        }
        let index = channel * FIELD_LEN + cell;
        let consumed = requested.min(self.values[index].max(0.0));
        self.values[index] -= consumed;
        consumed
    }

    pub fn gradient(&self, channel: usize, x_um: f32, y_um: f32) -> (f32, f32) {
        let (ix, iy) = Self::coordinates(x_um, y_um);
        let left = ix.saturating_sub(1);
        let right = (ix + 1).min(FIELD_WIDTH - 1);
        let up = iy.saturating_sub(1);
        let down = (iy + 1).min(FIELD_HEIGHT - 1);
        let gx = (self.values[Self::index(channel, right, iy)]
            - self.values[Self::index(channel, left, iy)])
            / ((right - left).max(1) as f32 * Self::dx_um());
        let gy = (self.values[Self::index(channel, ix, down)]
            - self.values[Self::index(channel, ix, up)])
            / ((down - up).max(1) as f32 * Self::dy_um());
        (gx, gy)
    }

    pub fn add_local(&mut self, channel: usize, x_um: f32, y_um: f32, delta: f32) {
        if channel >= FIELD_COUNT || !delta.is_finite() {
            return;
        }
        let (ix, iy) = Self::coordinates(x_um, y_um);
        let index = Self::index(channel, ix, iy);
        self.sources[index] += delta;
    }

    pub fn deposit_disc(
        &mut self,
        channel: usize,
        x_um: f32,
        y_um: f32,
        radius_um: f32,
        peak_delta: f32,
    ) {
        if channel >= FIELD_COUNT
            || !x_um.is_finite()
            || !y_um.is_finite()
            || !radius_um.is_finite()
            || !peak_delta.is_finite()
            || radius_um <= 0.0
        {
            return;
        }

        let sigma2 = (radius_um * 0.5).powi(2).max(1.0);
        let min_x = (((x_um - radius_um) / Self::dx_um()).floor() as isize)
            .clamp(0, FIELD_WIDTH as isize - 1) as usize;
        let max_x = (((x_um + radius_um) / Self::dx_um()).ceil() as isize)
            .clamp(0, FIELD_WIDTH as isize - 1) as usize;
        let min_y = (((y_um - radius_um) / Self::dy_um()).floor() as isize)
            .clamp(0, FIELD_HEIGHT as isize - 1) as usize;
        let max_y = (((y_um + radius_um) / Self::dy_um()).ceil() as isize)
            .clamp(0, FIELD_HEIGHT as isize - 1) as usize;

        for iy in min_y..=max_y {
            let cy = (iy as f32 + 0.5) * Self::dy_um();
            for ix in min_x..=max_x {
                let cx = (ix as f32 + 0.5) * Self::dx_um();
                let distance2 = (cx - x_um).powi(2) + (cy - y_um).powi(2);
                if distance2 <= radius_um * radius_um {
                    let weight = (-0.5 * distance2 / sigma2).exp();
                    self.sources[Self::index(channel, ix, iy)] += peak_delta * weight;
                }
            }
        }
    }

    pub fn step(&mut self, dt_seconds: f32) {
        debug_assert!(dt_seconds > 0.0);
        let inv_dx2 = 1.0 / Self::dx_um().powi(2);
        let inv_dy2 = 1.0 / Self::dy_um().powi(2);
        let diffusion = [GLUCOSE_D_UM2_S, CUE_D_UM2_S];
        let decay = [0.0, std::f32::consts::LN_2 / CUE_HALF_LIFE_S];

        for channel in 0..FIELD_COUNT {
            let d = diffusion[channel];
            debug_assert!(d * dt_seconds * (inv_dx2 + inv_dy2) <= 0.5);
            for iy in 0..FIELD_HEIGHT {
                let up = iy.saturating_sub(1);
                let down = (iy + 1).min(FIELD_HEIGHT - 1);
                for ix in 0..FIELD_WIDTH {
                    let left = ix.saturating_sub(1);
                    let right = (ix + 1).min(FIELD_WIDTH - 1);
                    let index = Self::index(channel, ix, iy);
                    let center = self.values[index];
                    let laplacian = (self.values[Self::index(channel, left, iy)]
                        - 2.0 * center
                        + self.values[Self::index(channel, right, iy)])
                        * inv_dx2
                        + (self.values[Self::index(channel, ix, up)] - 2.0 * center
                            + self.values[Self::index(channel, ix, down)])
                            * inv_dy2;
                    let updated =
                        center + dt_seconds * (d * laplacian - decay[channel] * center)
                            + self.sources[index];
                    self.next[index] = updated.max(0.0);
                    self.sources[index] = 0.0;
                }
            }
        }

        std::mem::swap(&mut self.values, &mut self.next);
    }

    pub fn mean(&self, channel: usize) -> f32 {
        let start = channel * FIELD_LEN;
        self.values[start..start + FIELD_LEN]
            .iter()
            .copied()
            .sum::<f32>()
            / FIELD_LEN as f32
    }

    pub fn max(&self, channel: usize) -> f32 {
        let start = channel * FIELD_LEN;
        self.values[start..start + FIELD_LEN]
            .iter()
            .copied()
            .fold(0.0, f32::max)
    }

    pub fn sum(&self, channel: usize) -> f32 {
        let start = channel * FIELD_LEN;
        self.values[start..start + FIELD_LEN]
            .iter()
            .copied()
            .sum()
    }

    pub(crate) fn pending_sources(&self) -> &[f32] {
        &self.sources
    }

    #[cfg(test)]
    pub fn set_cell(&mut self, channel: usize, ix: usize, iy: usize, value: f32) {
        self.values[Self::index(channel, ix, iy)] = value;
    }
}

#[cfg(test)]
mod tests {
    use super::{CUE, FIELD_HEIGHT, FIELD_WIDTH, Fields, GLUCOSE};

    #[test]
    fn no_flux_diffusion_conserves_field_sum() {
        let mut fields = Fields::new(0.0);
        fields.set_cell(GLUCOSE, FIELD_WIDTH / 2, FIELD_HEIGHT / 2, 10.0);
        let initial = fields.sum(GLUCOSE);
        for _ in 0..200 {
            fields.step(0.05);
        }
        let relative_error = (fields.sum(GLUCOSE) - initial).abs() / initial;
        assert!(relative_error < 2.0e-5, "relative error {relative_error}");
    }

    #[test]
    fn cue_decays_and_stays_non_negative() {
        let mut fields = Fields::new(0.0);
        fields.set_cell(CUE, 3, 3, 10.0);
        let initial = fields.sum(CUE);
        for _ in 0..20 {
            fields.step(0.05);
        }
        assert!(fields.sum(CUE) < initial);
        assert!(fields.values.iter().all(|value| *value >= 0.0));
    }

    #[test]
    fn temporal_refinement_reduces_diffusion_error() {
        fn evolved(dt: f32, steps: usize) -> Fields {
            let mut fields = Fields::new(0.0);
            fields.set_cell(GLUCOSE, FIELD_WIDTH / 2, FIELD_HEIGHT / 2, 10.0);
            for _ in 0..steps {
                fields.step(dt);
            }
            fields
        }

        fn l1_difference(left: &Fields, right: &Fields) -> f64 {
            left.values[..super::FIELD_LEN]
                .iter()
                .zip(&right.values[..super::FIELD_LEN])
                .map(|(left, right)| f64::from((*left - *right).abs()))
                .sum()
        }

        let coarse = evolved(0.05, 10);
        let refined = evolved(0.025, 20);
        let reference = evolved(0.0125, 40);
        let coarse_error = l1_difference(&coarse, &reference);
        let refined_error = l1_difference(&refined, &reference);

        assert!(
            refined_error < coarse_error * 0.6,
            "temporal refinement did not reduce error enough: coarse={coarse_error}, \
             refined={refined_error}"
        );
    }
}
