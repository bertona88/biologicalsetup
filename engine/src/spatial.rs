use crate::{SLIDE_HEIGHT_UM, SLIDE_WIDTH_UM, entities::Entities};

const BIN_SIZE_UM: f32 = 20.0;

#[derive(Clone, Debug)]
pub struct SpatialBins {
    width: usize,
    height: usize,
    counts: Vec<usize>,
    offsets: Vec<usize>,
    write_heads: Vec<usize>,
    members: Vec<usize>,
}

impl SpatialBins {
    pub fn new(capacity: usize) -> Self {
        let width = (SLIDE_WIDTH_UM / BIN_SIZE_UM).ceil() as usize;
        let height = (SLIDE_HEIGHT_UM / BIN_SIZE_UM).ceil() as usize;
        let cell_count = width * height;
        Self {
            width,
            height,
            counts: vec![0; cell_count],
            offsets: vec![0; cell_count + 1],
            write_heads: vec![0; cell_count],
            members: Vec::with_capacity(capacity),
        }
    }

    #[inline]
    fn cell(&self, x: f32, y: f32) -> usize {
        let ix = ((x / BIN_SIZE_UM).floor() as isize).clamp(0, self.width as isize - 1)
            as usize;
        let iy = ((y / BIN_SIZE_UM).floor() as isize)
            .clamp(0, self.height as isize - 1) as usize;
        iy * self.width + ix
    }

    pub fn rebuild(&mut self, entities: &Entities) {
        self.counts.fill(0);
        self.members.resize(entities.len(), 0);

        for index in 0..entities.len() {
            let cell = self.cell(entities.x[index], entities.y[index]);
            self.counts[cell] += 1;
        }

        self.offsets[0] = 0;
        for cell in 0..self.counts.len() {
            self.offsets[cell + 1] = self.offsets[cell] + self.counts[cell];
            self.write_heads[cell] = self.offsets[cell];
        }

        for index in 0..entities.len() {
            let cell = self.cell(entities.x[index], entities.y[index]);
            let write = self.write_heads[cell];
            self.members[write] = index;
            self.write_heads[cell] += 1;
        }
    }

    pub fn for_each_near(
        &self,
        x: f32,
        y: f32,
        radius: f32,
        mut visit: impl FnMut(usize),
    ) {
        let min_x = (((x - radius) / BIN_SIZE_UM).floor() as isize)
            .clamp(0, self.width as isize - 1) as usize;
        let max_x = (((x + radius) / BIN_SIZE_UM).floor() as isize)
            .clamp(0, self.width as isize - 1) as usize;
        let min_y = (((y - radius) / BIN_SIZE_UM).floor() as isize)
            .clamp(0, self.height as isize - 1) as usize;
        let max_y = (((y + radius) / BIN_SIZE_UM).floor() as isize)
            .clamp(0, self.height as isize - 1) as usize;

        for iy in min_y..=max_y {
            for ix in min_x..=max_x {
                let cell = iy * self.width + ix;
                for member in &self.members[self.offsets[cell]..self.offsets[cell + 1]] {
                    visit(*member);
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::SpatialBins;
    use crate::entities::{Entities, EntityKind};

    #[test]
    fn query_matches_expected_local_members() {
        let mut entities = Entities::new(16);
        entities.push(EntityKind::Bacterium, 10.0, 10.0, 0.0, 1.0);
        entities.push(EntityKind::Bacterium, 15.0, 10.0, 0.0, 1.0);
        entities.push(EntityKind::Bacterium, 200.0, 200.0, 0.0, 1.0);
        let mut bins = SpatialBins::new(16);
        bins.rebuild(&entities);
        let mut found = Vec::new();
        bins.for_each_near(10.0, 10.0, 12.0, |index| {
            let dx = entities.x[index] - 10.0;
            let dy = entities.y[index] - 10.0;
            if dx * dx + dy * dy <= 144.0 {
                found.push(index);
            }
        });
        found.sort_unstable();
        assert_eq!(found, vec![0, 1]);
    }
}
