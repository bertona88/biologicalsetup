use crate::MAX_ENTITIES;

#[repr(u8)]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum EntityKind {
    Bacterium = 1,
    Phagocyte = 2,
    Epithelium = 3,
    NeuronExcitatory = 4,
    NeuronInhibitory = 5,
}

impl EntityKind {
    pub fn from_u32(value: u32) -> Option<Self> {
        match value {
            1 => Some(Self::Bacterium),
            2 => Some(Self::Phagocyte),
            3 => Some(Self::Epithelium),
            4 => Some(Self::NeuronExcitatory),
            5 => Some(Self::NeuronInhibitory),
            _ => None,
        }
    }
}

/// Dense, structure-of-arrays storage used by every hot entity loop.
#[derive(Clone, Debug)]
pub struct Entities {
    pub ids: Vec<u32>,
    pub kinds: Vec<EntityKind>,
    pub x: Vec<f32>,
    pub y: Vec<f32>,
    pub angle: Vec<f32>,
    pub radius: Vec<f32>,
    pub a: Vec<f32>,
    pub b: Vec<f32>,
    pub c: Vec<f32>,
    pub d: Vec<f32>,
    pub e: Vec<f32>,
    pub f: Vec<f32>,
    pub target: Vec<u32>,
    next_id: u32,
}

impl Entities {
    pub fn new(capacity: usize) -> Self {
        let capacity = capacity.min(MAX_ENTITIES);
        Self {
            ids: Vec::with_capacity(capacity),
            kinds: Vec::with_capacity(capacity),
            x: Vec::with_capacity(capacity),
            y: Vec::with_capacity(capacity),
            angle: Vec::with_capacity(capacity),
            radius: Vec::with_capacity(capacity),
            a: Vec::with_capacity(capacity),
            b: Vec::with_capacity(capacity),
            c: Vec::with_capacity(capacity),
            d: Vec::with_capacity(capacity),
            e: Vec::with_capacity(capacity),
            f: Vec::with_capacity(capacity),
            target: Vec::with_capacity(capacity),
            next_id: 1,
        }
    }

    pub fn len(&self) -> usize {
        self.ids.len()
    }

    pub fn push(
        &mut self,
        kind: EntityKind,
        x: f32,
        y: f32,
        angle: f32,
        radius: f32,
    ) -> Option<u32> {
        if self.len() >= MAX_ENTITIES {
            return None;
        }
        let id = self.next_id;
        self.next_id = self.next_id.saturating_add(1);
        self.ids.push(id);
        self.kinds.push(kind);
        self.x.push(x);
        self.y.push(y);
        self.angle.push(angle);
        self.radius.push(radius);
        self.a.push(0.0);
        self.b.push(0.0);
        self.c.push(0.0);
        self.d.push(0.0);
        self.e.push(0.0);
        self.f.push(0.0);
        self.target.push(0);
        Some(id)
    }

    pub fn index_of(&self, id: u32) -> Option<usize> {
        self.ids.iter().position(|candidate| *candidate == id)
    }

    pub fn remove_indices(&mut self, indices: &mut Vec<usize>) {
        indices.sort_unstable();
        indices.dedup();
        for index in indices.drain(..).rev() {
            if index >= self.len() {
                continue;
            }
            self.ids.swap_remove(index);
            self.kinds.swap_remove(index);
            self.x.swap_remove(index);
            self.y.swap_remove(index);
            self.angle.swap_remove(index);
            self.radius.swap_remove(index);
            self.a.swap_remove(index);
            self.b.swap_remove(index);
            self.c.swap_remove(index);
            self.d.swap_remove(index);
            self.e.swap_remove(index);
            self.f.swap_remove(index);
            self.target.swap_remove(index);
        }
    }

}
