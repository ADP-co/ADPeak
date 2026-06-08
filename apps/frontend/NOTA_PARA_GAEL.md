# Nota para Gael

Esta nota aplica a la rama `develop`.

## Componentes disponibles

Ya existe la carpeta:

```txt
apps/frontend/src/components/
```

Por eso estos imports funcionan en `apps/frontend/src/App.tsx` o archivos dentro de `src`:

```ts
import { Navbar } from './components/layout/Navbar';
import { UserBanner } from './components/layout/UserBanner';
import { IndicatorForm } from './components/forms/IndicatorForm';
import type { IndicatorTemplate } from './components/forms/formConfig';
import { ProgressBar } from './components/layout/ProgressBar';
import { IndicatorsTable } from './components/ui/IndicatorsTable';
import type { Indicator } from './components/ui/IndicatorsTable';
import { UsersTable } from './components/ui/UsersTable';
import { IndicatorsManagementTable } from './components/ui/IndicatorsManagement';
import { Dashboard } from './components/ui/Dashboard';
```

## Despues de actualizar

Desde la raiz del repo:

```bash
git checkout develop
git pull origin develop
npm install
npm run build
```

Si el editor sigue marcando rojo despues del `pull`, reinicia el servidor de TypeScript o cierra y abre VS Code.
