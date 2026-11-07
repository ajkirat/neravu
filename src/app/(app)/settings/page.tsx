import Link from "next/link";
import { isDemoOwner } from "@/lib/demo";
import { DEMO_STAFF_PASSWORD, DEMO_STAFF_PHONE } from "@/lib/demo-seed";
import { resetDemo } from "@/app/actions/demo";
import { addTestDataAction, removeTestDataAction } from "@/app/actions/test-data";
import { hasTestData } from "@/lib/test-data";
import { TESTING_PHASE } from "@/lib/testing";
import { cookies } from "next/headers";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { appOrigin } from "@/lib/url";
import { saveSettings } from "@/app/actions/settings";
import { savePayConfirm, simulateBankAlert, uploadBankEmail } from "@/app/actions/pay-confirm";
import { ActionButton } from "@/components/today-actions";
import { taggedRupees } from "@/lib/paycode";
import type { MsgKey } from "@/lib/i18n";
import { ActionForm } from "@/components/action-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PaymentSettingsForm } from "@/components/payment-settings-form";
import { TextSizeToggle } from "@/components/text-size-toggle";
import { Card, Field, PageHeader, Badge } from "@/components/ui";

export const maxDuration = 60;

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const owner = await requireOwner();
  const { t } = await getT();
  const large = (await cookies()).get("neravu_text")?.value === "lg";
  const full = await db.owner.findUnique({
    where: { id: owner.id },
    select: { upiId: true, payConfirm: true, bankInbox: true, bankLast4: true, bankForwardNote: true },
  });
  const inboxDomain = process.env.INBOUND_EMAIL_DOMAIN;
  const inbox = full?.bankInbox && inboxDomain ? `pay-${full.bankInbox}@${inboxDomain}` : null;
  const bankAvailable = !!inboxDomain || isDemoOwner(owner.email) || full?.payConfirm === "BANK";
  const credits = full?.payConfirm === "BANK"
    ? await db.bankCredit.findMany({ where: { ownerId: owner.id }, orderBy: { createdAt: "desc" }, take: 5 })
    : [];
  const hasTest = TESTING_PHASE ? await hasTestData(owner.id) : false;
  const mode = (["NONE", "UPI", "RAZORPAY"].includes(owner.paymentMode) ? owner.paymentMode : "UPI") as "NONE" | "UPI" | "RAZORPAY";
  return (
    <>
      <PageHeader title={t("settingsTitle")} subtitle={t("settingsSub")} />
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* Left: you and your PG. Right: how money comes in. */}
        <div className="min-w-0 space-y-6">
          <Card title={t("pitchNav")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-md text-sm text-muted">{t("pitchCardBody")}</p>
              <Link href="/settings/pitch" className="btn-accent" data-testid="open-pitch">
                {t("pitchOpen")} →
              </Link>
            </div>
          </Card>
            <Card>
              <ActionForm action={saveSettings} submitLabel={t("saveSettings")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("yourName")} hint={t("settingsLoginHint")}>
                    <input name="name" className="input" required defaultValue={owner.name} />
                  </Field>
                  <Field label={t("mobileNumber")} hint={t("settingsLoginHint")}>
                    <input name="phone" type="tel" inputMode="numeric" className="input" required defaultValue={owner.phone ?? ""} />
                  </Field>
                </div>
                <Field label={t("businessName")} hint={t("businessNameHint")}>
                  <input name="businessName" className="input" defaultValue={owner.businessName ?? ""} />
                </Field>
                <Field label={t("houseRulesLabel")} hint={t("houseRulesHint")}>
                  <textarea name="houseRules" className="input" rows={4} maxLength={800} defaultValue={owner.houseRules ?? ""} />
                </Field>
              </ActionForm>
            </Card>
            <Card title={t("appLanguage")}>
              <p className="mb-3 text-sm text-muted">{t("appLanguageHint")}</p>
              <div className="flex flex-wrap items-center gap-3">
                <LanguageSwitcher />
                <TextSizeToggle large={large} />
              </div>
            </Card>
            {isDemoOwner(owner.email) && (
              <Card title={t("demoTitle")}>
                <p className="mb-3 text-sm text-muted">{t("demoBody")}</p>
                <ActionForm action={resetDemo} submitLabel={t("demoBtn")} confirm={t("demoConfirm")} />
                <p className="mt-3 text-xs text-muted">{t("demoStaff", { phone: DEMO_STAFF_PHONE, pw: DEMO_STAFF_PASSWORD })}</p>
              </Card>
            )}
            {TESTING_PHASE && !isDemoOwner(owner.email) && (
              <Card title={t("testDataTitle")}>
                <p className="mb-3 text-sm text-muted">{t("testDataBody")}</p>
                {hasTest && <p className="mb-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{t("testDataHas")}</p>}
                <div className="flex flex-wrap gap-3">
                  <ActionForm action={addTestDataAction} submitLabel={t("testDataAdd")} confirm={t("testDataConfirm")} />
                  {/* Always shown, so its "removed" message stays on screen after the sample PG is gone. */}
                  <ActionForm action={removeTestDataAction} submitLabel={t("testDataRemove")} submitClassName="btn-danger" confirm={t("testDataRemoveConfirm")} />
                </div>
                <p className="mt-3 text-xs text-muted">{t("testDataSamePhone")}</p>
              </Card>
            )}
        </div>
        <div className="min-w-0 space-y-6">
            <Card title={t("payHowTitle")}>
              <PaymentSettingsForm
                initialMode={mode}
                upiId={full?.upiId ?? ""}
                razorpayKeyId={owner.razorpayKeyId ?? ""}
                razorpayEnabled={owner.razorpayEnabled}
                webhookUrl={`${await appOrigin()}/api/webhooks/razorpay/${owner.id}`}
              />
            </Card>
            <Card title={t("confirmTitle")}>
              <ActionForm action={savePayConfirm} submitLabel={t("save")}>
                <p className="text-sm text-muted">{t("confirmB")}</p>
                <label className="flex items-start gap-3 rounded-xl border border-line p-3">
                  <input type="radio" name="payConfirm" value="OWNER" defaultChecked={full?.payConfirm !== "BANK"} className="mt-1 h-5 w-5" />
                  <span>
                    <span className="block font-semibold text-brand-900">{t("confirmA")}</span>
                    <span className="block text-sm text-muted">{t("confirmAHint")}</span>
                  </span>
                </label>
                {/* Bank alerts need the server's inbound email set up; until then the choice is shown, but off. */}
                <label className={`flex items-start gap-3 rounded-xl border border-line p-3 ${bankAvailable ? "" : "opacity-60"}`}>
                  <input type="radio" name="payConfirm" value="BANK" defaultChecked={full?.payConfirm === "BANK"} disabled={!bankAvailable} className="mt-1 h-5 w-5" />
                  <span>
                    <span className="block font-semibold text-brand-900">
                      {t("confirmC")} {!bankAvailable && <Badge tone="amber">{t("comingSoon")}</Badge>}
                    </span>
                    <span className="block text-sm text-muted">{t("confirmCHint")}</span>
                  </span>
                </label>
                {bankAvailable && (
                  <Field label={t("bankLast4")} hint={t("bankLast4Hint")}>
                    <input name="bankLast4" className="input sm:max-w-40" inputMode="numeric" maxLength={4} defaultValue={full?.bankLast4 ?? ""} />
                  </Field>
                )}
              </ActionForm>
              {full?.payConfirm === "BANK" && (
                <div className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
                  <p className="font-semibold text-brand-900">{t("bankSetupTitle")}</p>
                  {inbox ? (
                    <>
                      <ol className="list-decimal space-y-1 pl-5">
                        <li>{t("bankStep1")}</li>
                        <li>
                          {t("bankStep2")} <span className="font-mono break-all text-brand-900">{inbox}</span>
                        </li>
                        <li>{t("bankStep3")}</li>
                        <li>{t("bankStep4")}</li>
                      </ol>
                      {full.bankForwardNote && (
                        <p className="rounded-lg bg-marigold-100 px-3 py-2 text-marigold-700">
                          {t("bankForwardNote")}{" "}
                          {full.bankForwardNote.startsWith("http") ? (
                            <a href={full.bankForwardNote} target="_blank" rel="noreferrer" className="font-semibold underline">
                              {t("bankForwardOpen")}
                            </a>
                          ) : (
                            <span className="font-mono">{full.bankForwardNote}</span>
                          )}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="rounded-lg bg-marigold-100 px-3 py-2 text-marigold-700">{t("bankNotReady")}</p>
                  )}
                  <div className="rounded-xl bg-canvas p-3">
                    <p className="font-semibold text-brand-900">{t("bankUploadTitle")}</p>
                    <p className="mb-2 text-muted">{t("bankUploadHint")}</p>
                    <ActionForm action={uploadBankEmail} submitLabel={t("bankUploadBtn")} submitClassName="btn-secondary btn-sm" className="flex flex-wrap items-center gap-2">
                      <input name="eml" type="file" accept=".eml,message/rfc822" className="block text-sm" required />
                    </ActionForm>
                    {isDemoOwner(owner.email) && (
                      <div className="mt-3 border-t border-line pt-3">
                        <ActionButton action={simulateBankAlert} label={t("simBtn")} className="btn-accent btn-sm" />
                        <p className="mt-1 text-xs text-muted">{t("simHint")}</p>
                      </div>
                    )}
                  </div>
                  {credits.length > 0 && (
                    <div>
                      <p className="font-semibold text-brand-900">{t("bankRecent")}</p>
                      <ul className="mt-1 divide-y divide-line">
                        {credits.map((c) => (
                          <li key={c.id} className="flex justify-between gap-3 py-1.5">
                            <span>{taggedRupees(Math.floor(c.amountPaise / 100), c.amountPaise % 100)}{c.utr ? ` · ${c.utr}` : ""}</span>
                            <span className="text-muted">{t(`credit_${c.status}` as MsgKey)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </Card>
        </div>
      </div>
    </>
  );
}
