import { actmsgs } from "./parts/actmsgs";
import { auth } from "./parts/auth";
import { autorem } from "./parts/autorem";
import { bulk } from "./parts/bulk";
import { common } from "./parts/common";
import { dashboard } from "./parts/dashboard";
import { elec } from "./parts/elec";
import { expenses } from "./parts/expenses";
import { leads } from "./parts/leads";
import { misc } from "./parts/misc";
import { nav } from "./parts/nav";
import { payments } from "./parts/payments";
import { paymodes } from "./parts/paymodes";
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
  ...expenses,
  ...paymodes,
  ...autorem,
  ...bulk,
  ...actmsgs,
  ...elec,
};

export type MsgKey = keyof typeof messages;
