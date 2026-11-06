/**
 * TESTING PHASE switch. While true:
 * - one mobile number may be an owner AND a caretaker at the same time (tenants can always share
 *   numbers), so one person can try every role with their own phone;
 * - Settings shows "Add test data" / "Remove test data" for every owner.
 * Set to false before real owners start using Neravu.
 */
export const TESTING_PHASE = true;
