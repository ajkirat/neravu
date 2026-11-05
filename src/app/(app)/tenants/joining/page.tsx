import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { fmtDate, whatsappNumber } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { ActionForm } from "@/components/action-form";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { rejectJoin } from "@/app/actions/join";

export const metadata = { title: "New joiners" };

export default async function JoiningPage() {
  const owner = await requireOwner();
  const { t, lang } = await getT();
  const requests = await db.joinRequest.findMany({
    where: { ownerId: owner.id, status: "PENDING" },
    include: { property: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return (
    <>
      <PageHeader
        back={{ href: "/tenants", label: t("tenantsTitle") }}
        title={t("joiningTitle")}
        subtitle={t("joiningSub")}
      />
      {requests.length === 0 ? (
        <EmptyState title={t("joiningNone")} body={t("joiningNoneBody")} />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-brand-900">{r.name}</p>
                  <p className="text-sm text-muted">
                    <a href={`tel:${r.phone}`} className="hover:underline">
                      {r.phone}
                    </a>{" "}
                    · {r.property.name} · {t("joiningFilledOn", { date: fmtDate(r.createdAt, lang) })}
                  </p>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
                    <dt className="text-muted">{t("idProof")}</dt>
                    <dd>
                      {r.idType} · {r.idNumber}
                    </dd>
                    {r.occupation && (
                      <>
                        <dt className="text-muted">{t("occupation")}</dt>
                        <dd>{r.occupation}</dd>
                      </>
                    )}
                    {r.emergencyName && (
                      <>
                        <dt className="text-muted">{t("emergencyName")}</dt>
                        <dd>
                          {r.emergencyName}
                          {r.emergencyPhone ? ` · ${r.emergencyPhone}` : ""}
                        </dd>
                      </>
                    )}
                  </dl>
                </div>
                <a
                  className="btn-accent btn-sm"
                  target="_blank"
                  rel="noreferrer"
                  href={`https://wa.me/${whatsappNumber(r.phone)}`}
                >
                  {t("whatsapp")}
                </a>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
                <Link href={`/tenants/new?join=${r.id}`} className="btn-primary">
                  {t("joiningApprove")}
                </Link>
                <ActionForm
                  action={async () => {
                    "use server";
                    await rejectJoin(r.id);
                    return undefined;
                  }}
                  submitLabel={t("joiningReject")}
                  submitClassName="btn-secondary"
                  className="inline"
                  confirm={t("joiningRejectConfirm")}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
