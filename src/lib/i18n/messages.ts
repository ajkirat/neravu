import { auth } from "./parts/auth";
import { common } from "./parts/common";
import { dashboard } from "./parts/dashboard";
import { leads } from "./parts/leads";
import { misc } from "./parts/misc";
import { nav } from "./parts/nav";
import { payments } from "./parts/payments";
import { properties } from "./parts/properties";
import { publicPages } from "./parts/public";
import { settings } from "./parts/settings";
import { tenantforms } from "./parts/tenantforms";
import { tenants } from "./parts/tenants";

export const messages = {
  ...common,
  ...nav,
  ...auth,
  ...properties,
  ...dashboard,
  ...tenants,
  ...tenantforms,
  ...payments,
  ...leads,
  ...settings,
  ...publicPages,
  ...misc,
};

export type MsgKey = keyof typeof messages;
