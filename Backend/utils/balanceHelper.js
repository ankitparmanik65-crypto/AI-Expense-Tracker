import Account from "../models/Account.js";

/**
 * Transaction add hone pe balance update karo
 * Income → balance increase
 * Expense → balance decrease
 */
export const updateBalanceOnCreate = async (accountId, type, amount) => {
  if (!accountId) return;

  const account = await Account.findById(accountId);
  if (!account) return;

  if (type === "income") {
    account.balance += Number(amount);
  } else if (type === "expense") {
    account.balance -= Number(amount);
  }

  await account.save();
};

/**
 * Transaction update hone pe balance adjust karo
 * Purana effect hataao, naya lagao
 */
export const updateBalanceOnUpdate = async (
  accountId,
  oldType,
  oldAmount,
  newType,
  newAmount
) => {
  if (!accountId) return;

  const account = await Account.findById(accountId);
  if (!account) return;

  // Purana effect hataao
  if (oldType === "income") {
    account.balance -= Number(oldAmount);
  } else if (oldType === "expense") {
    account.balance += Number(oldAmount);
  }

  // Naya effect lagao
  if (newType === "income") {
    account.balance += Number(newAmount);
  } else if (newType === "expense") {
    account.balance -= Number(newAmount);
  }

  await account.save();
};

/**
 * Transaction delete hone pe balance revert karo
 */
export const updateBalanceOnDelete = async (accountId, type, amount) => {
  if (!accountId) return;

  const account = await Account.findById(accountId);
  if (!account) return;

  if (type === "income") {
    account.balance -= Number(amount);
  } else if (type === "expense") {
    account.balance += Number(amount);
  }

  await account.save();
};

/**
 * Account change hone pe — purane account se hataao, naye me daalo
 */
export const handleAccountChange = async (
  oldAccountId,
  newAccountId,
  type,
  amount
) => {
  // Purane account se hataao
  if (oldAccountId && oldAccountId.toString() !== newAccountId?.toString()) {
    await updateBalanceOnDelete(oldAccountId, type, amount);
  }

  // Naye account me add karo (agar alag account hai)
  if (newAccountId && oldAccountId?.toString() !== newAccountId.toString()) {
    await updateBalanceOnCreate(newAccountId, type, amount);
  }

  // Agar same account hai aur amount/type badla hai — wo update handler karega
};