type PickerPermission = { id: number; code: string; groupName: string; description: string | null };

type Props = {
  permissions: PickerPermission[];
  selected: number[];
  onChange: (ids: number[]) => void;
};

// Chọn permission dạng pill theo nhóm (groupName) — chỉ nhận permission "assignable" (không restricted,
// đã lọc từ trước qua GET .../permissions?assignable=true). Xem SECURITY.md §2.
export function PermissionPicker({ permissions, selected, onChange }: Props) {
  const groups = new Map<string, PickerPermission[]>();
  for (const p of permissions) {
    const list = groups.get(p.groupName) ?? [];
    list.push(p);
    groups.set(p.groupName, list);
  }

  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  if (permissions.length === 0) {
    return <p className="text-xs text-ink-muted">Chưa có permission nào có thể gán.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {[...groups.entries()].map(([group, perms]) => (
        <div key={group}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{group}</p>
          <div className="flex flex-wrap gap-2">
            {perms.map((p) => {
              const checked = selected.includes(p.id);
              return (
                <label
                  key={p.id}
                  title={p.description ?? undefined}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    checked ? 'border-rose bg-rose-light text-rose-dark' : 'border-border text-ink-soft hover:border-ink-soft'
                  }`}
                >
                  <input type="checkbox" className="hidden" checked={checked} onChange={() => toggle(p.id)} />
                  {p.code}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
