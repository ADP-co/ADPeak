# Components compatibility folder

This folder is a compatibility layer for teammates who import from `src/components/...`.

The real implementations live in `src/componentes/...`. Files here only re-export from that canonical folder, so both import styles work:

```ts
import { Navbar } from './components/layout/Navbar';
import { Navbar } from './componentes/layout/Navbar';
```

Prefer keeping component implementations in `src/componentes`.
