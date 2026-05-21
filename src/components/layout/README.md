# Layout Shell Components

## Shell structure

```
<AppLayout>          (app)/layout.tsx — server component
  <TopBar />         firm context + user dropdown
  <Sidebar />        module navigation rail
  <main>
    {children}       ← page renders here
  </main>
  <AssistantBubble />
</AppLayout>
```

## Breadcrumbs

Pages opt-in by rendering `<Breadcrumbs>` as their first element:

```tsx
import { Breadcrumbs } from '@/components/layout/breadcrumbs';

export default function MandantenPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Mandanten' }]} />
      <div className="p-6">...</div>
    </>
  );
}
```

Nested routes pass multiple items; last item has no `href`:

```tsx
<Breadcrumbs items={[
  { label: 'Mandanten', href: '/mandanten' },
  { label: 'Müller GmbH' },
]} />
```

## Inspector

Pages that need a right-side detail panel wrap their main area in a flex row
and opt-in to `<Inspector>`:

```tsx
import { Inspector } from '@/components/layout/inspector';

export default function PbcDetailPage() {
  const [selected, setSelected] = useState<Item | null>(null);

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">
        {/* main content */}
      </div>
      {selected && (
        <Inspector title={selected.name} onClose={() => setSelected(null)}>
          {/* detail content */}
        </Inspector>
      )}
    </div>
  );
}
```

The shell provides no persistent Inspector slot — pages control it themselves.
