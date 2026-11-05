import { FormEvent, useState } from "react";
import { actions, useDB } from "../store";
import { Button, Card, Field, Input, PageHeader } from "../components/ui";

export default function SettingsPage() {
  const { settings } = useDB();
  const [saved, setSaved] = useState(false);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget), g = (k: string) => f.get(k) as string;
    actions.saveSettings({ pgName: g("pgName"), ownerName: g("ownerName"), ownerPhone: g("ownerPhone"),
      dueDay: +g("dueDay"), reminderTemplate: g("reminderTemplate") });
    setSaved(true);
  };
  return (
    <>
      <PageHeader title="Settings" />
      <Card className="max-w-xl p-5">
        <form onSubmit={submit} onChange={() => setSaved(false)} className="space-y-3">
          <Field label="PG / business name"><Input name="pgName" defaultValue={settings.pgName} required /></Field>
          <Field label="Owner name"><Input name="ownerName" defaultValue={settings.ownerName} /></Field>
          <Field label="Owner phone"><Input name="ownerPhone" defaultValue={settings.ownerPhone} /></Field>
          <Field label="Rent due day of month"><Input name="dueDay" type="number" min={1} max={28} defaultValue={settings.dueDay} required /></Field>
          <Field label="Reminder message ({name} {amount} {month} {pg})">
            <textarea name="reminderTemplate" rows={3} defaultValue={settings.reminderTemplate}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <div className="flex items-center gap-3"><Button type="submit">Save</Button>{saved && <span className="text-sm text-emerald-600">Saved</span>}</div>
        </form>
      </Card>
      <Card className="mt-6 max-w-xl p-5">
        <h2 className="font-semibold">Demo data</h2>
        <p className="mb-3 text-sm text-slate-500">Data is stored in this browser only. Reset to the sample dataset anytime.</p>
        <Button variant="danger" onClick={() => confirm("Replace all data with demo data?") && actions.resetDemo()}>Reset to demo data</Button>
      </Card>
    </>
  );
}
