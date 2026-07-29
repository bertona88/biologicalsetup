mod entities;
mod field;
mod rng;
mod spatial;
mod world;

use std::cell::RefCell;

use entities::EntityKind;
use field::{CUE, FIELD_HEIGHT, FIELD_LEN, FIELD_WIDTH, GLUCOSE};
use world::{METRICS_LEN, Preset, SNAPSHOT_STRIDE, World};

pub const SLIDE_WIDTH_UM: f32 = 400.0;
pub const SLIDE_HEIGHT_UM: f32 = 260.0;
pub const MAX_ENTITIES: usize = 8_192;
pub const ENGINE_ABI_VERSION: u32 = 1;

thread_local! {
    static WORLD: RefCell<World> = RefCell::new(World::new(1, Preset::HostMicrobe));
}

#[unsafe(no_mangle)]
pub extern "C" fn engine_version() -> u32 {
    ENGINE_ABI_VERSION
}

#[unsafe(no_mangle)]
pub extern "C" fn world_reset(seed_low: u32, seed_high: u32, preset: u32) -> u32 {
    let Some(preset) = Preset::from_u32(preset) else {
        return 0;
    };
    let seed = (seed_high as u64) << 32 | seed_low as u64;
    WORLD.with_borrow_mut(|world| world.reset(seed, preset));
    1
}

#[unsafe(no_mangle)]
pub extern "C" fn world_advance(seconds: f32) -> u32 {
    WORLD.with_borrow_mut(|world| world.advance(seconds))
}

#[unsafe(no_mangle)]
pub extern "C" fn world_place(kind: u32, x_um: f32, y_um: f32, amount: f32) -> u32 {
    WORLD.with_borrow_mut(|world| match kind {
        10 => {
            world.deposit_field(GLUCOSE, x_um, y_um, 28.0, amount.clamp(0.05, 3.0));
            0
        }
        11 => {
            world.deposit_field(CUE, x_um, y_um, 24.0, amount.clamp(0.05, 5.0));
            0
        }
        _ => EntityKind::from_u32(kind)
            .map(|entity_kind| world.place_entity(entity_kind, x_um, y_um))
            .unwrap_or(0),
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn world_remove_at(x_um: f32, y_um: f32, radius_um: f32) -> u32 {
    WORLD.with_borrow_mut(|world| world.remove_at(x_um, y_um, radius_um))
}

#[unsafe(no_mangle)]
pub extern "C" fn world_stimulate(x_um: f32, y_um: f32, strength: f32) -> u32 {
    WORLD.with_borrow_mut(|world| world.stimulate(x_um, y_um, strength))
}

#[unsafe(no_mangle)]
pub extern "C" fn world_select_at(x_um: f32, y_um: f32, radius_um: f32) -> u32 {
    WORLD.with_borrow(|world| world.select_at(x_um, y_um, radius_um))
}

#[unsafe(no_mangle)]
pub extern "C" fn world_last_status() -> u32 {
    WORLD.with_borrow(|world| world.last_status)
}

#[unsafe(no_mangle)]
pub extern "C" fn world_entity_count() -> u32 {
    WORLD.with_borrow(|world| world.entities.len() as u32)
}

#[unsafe(no_mangle)]
pub extern "C" fn world_entity_stride_f32() -> u32 {
    SNAPSHOT_STRIDE as u32
}

#[unsafe(no_mangle)]
pub extern "C" fn world_prepare_snapshot() {
    WORLD.with_borrow_mut(World::prepare_snapshot);
}

#[unsafe(no_mangle)]
pub extern "C" fn world_entities_ptr() -> *const f32 {
    WORLD.with_borrow(|world| world.snapshot.as_ptr())
}

#[unsafe(no_mangle)]
pub extern "C" fn world_metrics_ptr() -> *const f32 {
    WORLD.with_borrow(|world| world.metrics.as_ptr())
}

#[unsafe(no_mangle)]
pub extern "C" fn world_metrics_len() -> u32 {
    METRICS_LEN as u32
}

#[unsafe(no_mangle)]
pub extern "C" fn world_field_ptr(channel: u32) -> *const f32 {
    WORLD.with_borrow(|world| {
        let channel = channel.min(1) as usize;
        world.fields.values[channel * FIELD_LEN..].as_ptr()
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn world_field_width() -> u32 {
    FIELD_WIDTH as u32
}

#[unsafe(no_mangle)]
pub extern "C" fn world_field_height() -> u32 {
    FIELD_HEIGHT as u32
}

#[unsafe(no_mangle)]
pub extern "C" fn world_connection_count() -> u32 {
    WORLD.with_borrow(|world| (world.connection_snapshot.len() / 4) as u32)
}

#[unsafe(no_mangle)]
pub extern "C" fn world_connections_ptr() -> *const f32 {
    WORLD.with_borrow(|world| world.connection_snapshot.as_ptr())
}

#[unsafe(no_mangle)]
pub extern "C" fn world_state_hash_low() -> u32 {
    WORLD.with_borrow_mut(|world| world.state_hash() as u32)
}

#[unsafe(no_mangle)]
pub extern "C" fn world_state_hash_high() -> u32 {
    WORLD.with_borrow_mut(|world| (world.state_hash() >> 32) as u32)
}

