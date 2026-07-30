# Interface contract

## Runtime layers

### Simulation engine

Rust/WebAssembly owns biological state, numerical stepping, stochastic state,
entity capacity, spatial queries, field buffers, event counters, and
deterministic resets.

### Actions

Version 1 submits primitive, synchronous WebAssembly ABI calls. Those calls
change model state, never pixels directly. Deterministic replay therefore
depends on retaining the ordered calls, their arguments, the seed, the preset,
and the requested step sequence outside the engine.

The on-screen event ledger is a bounded, human-readable activity summary. It is
assembled from user interactions and changes in exported counters; it is not an
authoritative, complete, machine-readable action log and is not included in a
shared recipe URL.

A future action-ledger ABI may use versioned records such as:

```json
{
  "schemaVersion": 1,
  "type": "place-entity",
  "model": "host-microbe-v1",
  "timeSeconds": 12.5,
  "position": {
    "frame": "slide-local",
    "xUm": 184.2,
    "yUm": 96.4
  },
  "parameters": {
    "entityType": "bacterium"
  },
  "provenance": {
    "source": "pointer",
    "seed": "164271829"
  }
}
```

That JSON action format is a design target, not an implemented version 1
interface.

### Observations

Renderers treat exported snapshots and field buffers as read-only:

- `phase`: geometry, kind, depth proxy, and motion;
- `fluorescence`: declared internal state and generic labelled channels;
- `chemistry`: glucose and chemoattractant field buffers;
- `analysis`: population counts, field means, event counters, and selected
  entity state.

Changing an observation mode cannot change the simulation.

### Interface

HTML controls and the canvas map pointer, touch, drag/drop, and keyboard input
into actions, view state, and selection. Selection is read-only. The interface
does not retain a second authoritative copy of the biological state.

## WebAssembly ABI

Version 1 intentionally uses a small dependency-free C-compatible ABI:

```text
engine_version() -> u32
world_reset(seed_lo, seed_hi, preset) -> 1 on success, 0 on invalid preset
world_advance(elapsed_seconds) -> performed_steps
world_place(kind, x_um, y_um, amount) -> entity_id, or 0
world_remove_at(x_um, y_um, radius_um) -> removed_entity_id, or 0
world_stimulate(x_um, y_um, strength) -> affected_entity_id, or 0
world_select_at(x_um, y_um, radius_um) -> entity_id, or 0
world_last_status() -> status
world_entity_count() -> u32
world_prepare_snapshot()
world_entities_ptr() -> pointer
world_entity_stride_f32() -> u32
world_metrics_ptr() -> pointer
world_metrics_len() -> u32
world_field_ptr(channel) -> pointer
world_field_width() -> u32
world_field_height() -> u32
world_connection_count() -> u32
world_connections_ptr() -> pointer
world_state_hash_low() -> u32
world_state_hash_high() -> u32
```

Entity placement returns the new entity id. A successful glucose or cue
placement returns `0`, because version 1 does not allocate action ids; callers
must inspect `world_last_status()` to distinguish that success from failure.
Status codes are `0` (ok), `1` (invalid action), `2` (incompatible model
chassis), `3` (capacity reached), and `4` (time backlog dropped).

Snapshots use fixed `repr(C)` records and JavaScript reads WebAssembly linear
memory through typed arrays. JavaScript must refresh views after calls that may
grow memory.

## Entity snapshot schema

The browser-facing record contains 12 `f32` values:

```text
id, kind, x_um, y_um, radius_um, orientation_rad,
state_a, state_b, state_c, state_d, target_id, reserved
```

The final slot is currently `0` and reserved for a future ABI-compatible use.
The meaning and units of `state_a` through `state_d` are declared per entity
kind in the interface. Internal solver state that is not present in this record
is not a stable cross-version API.

## Shareable state

Version 1 URLs serialize:

```json
{
  "version": 1,
  "preset": "host-microbe",
  "seed": "164271829",
  "view": "phase",
  "speed": 1
}
```

The URL restarts a deterministic preset. It does not claim to serialize an
arbitrary evolved experiment. Exact evolved states require a future versioned
snapshot or action-ledger format.

## Accessibility and input

- Every action available by drag/drop must also be available by click/tap and
  keyboard.
- Canvas actions expose an instruction and a live textual result.
- Control state is not communicated by colour alone.
- Focus is visible.
- Motion can be paused and reduced-motion preferences disable decorative
  transitions.
- Touch targets are at least 40 CSS pixels on compact layouts.

## Failure reporting

The engine and interface report:

- entity capacity reached;
- unsupported placement for the active model family;
- invalid or non-finite action parameters;
- timestep backlog dropped to protect responsiveness;
- WebAssembly load failure;
- incompatible engine ABI.

No failure may be disguised as a biologically meaningful event.

## Setup Universe boundary

No cross-Setup interface is implemented. Future optical, electrical, molecular,
or computational ports must declare schema version, owner, units, coordinate
frame, timebase, uncertainty, and provenance. Visual similarity or shared
globals do not constitute integration.
