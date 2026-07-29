# Interface contract

## Runtime layers

### Simulation engine

Rust/WebAssembly owns biological state, numerical stepping, stochastic state,
entity capacity, spatial queries, field buffers, event counters, and
deterministic resets.

### Actions

The interface submits versioned actions. An action changes model state, never
pixels directly.

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

### Observations

Renderers read immutable exported snapshots and field buffers:

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
world_reset(seed_lo, seed_hi, preset) -> status
world_advance(elapsed_seconds) -> performed_steps
world_place(kind, x_um, y_um, amount) -> entity_or_action_id
world_remove_at(x_um, y_um, radius_um) -> removed_count
world_stimulate(x_um, y_um, strength) -> affected_id
world_select_at(x_um, y_um, radius_um) -> entity_id
world_entity_count() -> u32
world_entities_ptr() -> pointer
world_entity_stride_f32() -> u32
world_field_ptr(channel) -> pointer
world_metrics_ptr() -> pointer
world_connections_ptr() -> pointer
world_connection_count() -> u32
```

Snapshots use fixed `repr(C)` records and JavaScript reads WebAssembly linear
memory through typed arrays. JavaScript must refresh views after calls that may
grow memory.

## Entity snapshot schema

The browser-facing record contains only observation data:

```text
id, kind, x_um, y_um, radius_um, orientation_rad,
state_a, state_b, state_c, flags
```

The meaning and units of state channels are declared per entity kind in the
interface. Internal solver state is not presented as a stable cross-version API.

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
snapshot format.

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

