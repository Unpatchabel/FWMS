-- Additive guards: no existing rows rewritten, deleted or relabelled.
-- Existing data must be reconciled separately; triggers validate future writes.

CREATE TRIGGER "Transaction_integrity_insert" BEFORE INSERT ON "Transaction"
WHEN typeof(NEW.amount) != 'integer' OR abs(NEW.amount) > 2147483647
 OR NEW.status NOT IN ('ACTIVE','VOID') OR NEW.type NOT IN ('INCOME','EXPENSE','ADJUSTMENT','TRANSFER')
 OR (NEW.type = 'INCOME' AND NEW.amount <= 0) OR (NEW.type = 'EXPENSE' AND NEW.amount >= 0)
 OR NOT EXISTS (SELECT 1 FROM Account WHERE id=NEW.accountId AND householdId=NEW.householdId)
 OR (NEW.categoryId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Category WHERE id=NEW.categoryId AND householdId=NEW.householdId AND type=NEW.type))
 OR (NEW.createdById IS NOT NULL AND NOT EXISTS (SELECT 1 FROM User WHERE id=NEW.createdById AND householdId=NEW.householdId))
 OR (NEW.type='TRANSFER' AND (NEW.amount=0 OR NEW.transferGroupId IS NULL OR NEW.transferAccountId IS NULL OR NEW.transferAccountId=NEW.accountId
 OR NOT EXISTS (SELECT 1 FROM Account WHERE id=NEW.transferAccountId AND householdId=NEW.householdId)))
BEGIN SELECT RAISE(ABORT, 'Financial integrity constraint failed'); END;

CREATE TRIGGER "Transaction_integrity_update" BEFORE UPDATE ON "Transaction"
WHEN typeof(NEW.amount) != 'integer' OR abs(NEW.amount) > 2147483647
 OR NEW.status NOT IN ('ACTIVE','VOID') OR NEW.type NOT IN ('INCOME','EXPENSE','ADJUSTMENT','TRANSFER')
 OR (NEW.type = 'INCOME' AND NEW.amount <= 0) OR (NEW.type = 'EXPENSE' AND NEW.amount >= 0)
 OR NOT EXISTS (SELECT 1 FROM Account WHERE id=NEW.accountId AND householdId=NEW.householdId)
 OR (NEW.categoryId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Category WHERE id=NEW.categoryId AND householdId=NEW.householdId AND type=NEW.type))
 OR (NEW.createdById IS NOT NULL AND NOT EXISTS (SELECT 1 FROM User WHERE id=NEW.createdById AND householdId=NEW.householdId))
 OR (NEW.type='TRANSFER' AND (NEW.amount=0 OR NEW.transferGroupId IS NULL OR NEW.transferAccountId IS NULL OR NEW.transferAccountId=NEW.accountId
 OR NOT EXISTS (SELECT 1 FROM Account WHERE id=NEW.transferAccountId AND householdId=NEW.householdId)))
BEGIN SELECT RAISE(ABORT, 'Financial integrity constraint failed'); END;

CREATE TRIGGER "Loan_integrity_insert" BEFORE INSERT ON "Loan"
WHEN NEW.openingBalance < COALESCE((SELECT SUM(principal) FROM LoanPayment WHERE loanId=NEW.id),0) OR typeof(NEW.originalAmount) != 'integer' OR NEW.originalAmount <= 0 OR NEW.originalAmount > 2147483647 OR typeof(NEW.openingBalance) != 'integer' OR NEW.openingBalance < 0 OR NEW.openingBalance > 2147483647 OR (NEW.monthlyPayment IS NOT NULL AND (typeof(NEW.monthlyPayment) != 'integer' OR NEW.monthlyPayment < 0 OR NEW.monthlyPayment > 2147483647))
BEGIN SELECT RAISE(ABORT, 'Financial integrity constraint failed'); END;

CREATE TRIGGER "Loan_integrity_update" BEFORE UPDATE ON "Loan"
WHEN NEW.openingBalance < COALESCE((SELECT SUM(principal) FROM LoanPayment WHERE loanId=NEW.id),0) OR typeof(NEW.originalAmount) != 'integer' OR NEW.originalAmount <= 0 OR NEW.originalAmount > 2147483647 OR typeof(NEW.openingBalance) != 'integer' OR NEW.openingBalance < 0 OR NEW.openingBalance > 2147483647 OR (NEW.monthlyPayment IS NOT NULL AND (typeof(NEW.monthlyPayment) != 'integer' OR NEW.monthlyPayment < 0 OR NEW.monthlyPayment > 2147483647))
BEGIN SELECT RAISE(ABORT, 'Financial integrity constraint failed'); END;

CREATE TRIGGER "LoanPayment_integrity_insert" BEFORE INSERT ON "LoanPayment"
WHEN typeof(NEW.amount) != 'integer' OR typeof(NEW.principal) != 'integer' OR typeof(NEW.interest) != 'integer'
 OR NEW.amount <= 0 OR NEW.amount > 2147483647 OR NEW.principal < 0 OR NEW.interest < 0 OR NEW.amount != NEW.principal + NEW.interest
 OR NEW.principal + COALESCE((SELECT SUM(principal) FROM LoanPayment WHERE loanId=NEW.loanId AND id!=NEW.id),0) > (SELECT openingBalance FROM Loan WHERE id=NEW.loanId)
 OR (NEW.transactionId IS NOT NULL AND NOT EXISTS (
 SELECT 1 FROM "Transaction" t JOIN Loan l ON l.id=NEW.loanId
 WHERE t.id=NEW.transactionId AND t.householdId=l.householdId AND t.type='EXPENSE' AND t.status='ACTIVE' AND t.amount=-NEW.amount))
BEGIN SELECT RAISE(ABORT, 'Financial integrity constraint failed'); END;

CREATE TRIGGER "LoanPayment_integrity_update" BEFORE UPDATE ON "LoanPayment"
WHEN typeof(NEW.amount) != 'integer' OR typeof(NEW.principal) != 'integer' OR typeof(NEW.interest) != 'integer'
 OR NEW.amount <= 0 OR NEW.amount > 2147483647 OR NEW.principal < 0 OR NEW.interest < 0 OR NEW.amount != NEW.principal + NEW.interest
 OR NEW.principal + COALESCE((SELECT SUM(principal) FROM LoanPayment WHERE loanId=NEW.loanId AND id!=NEW.id),0) > (SELECT openingBalance FROM Loan WHERE id=NEW.loanId)
 OR (NEW.transactionId IS NOT NULL AND NOT EXISTS (
 SELECT 1 FROM "Transaction" t JOIN Loan l ON l.id=NEW.loanId
 WHERE t.id=NEW.transactionId AND t.householdId=l.householdId AND t.type='EXPENSE' AND t.status='ACTIVE' AND t.amount=-NEW.amount))
BEGIN SELECT RAISE(ABORT, 'Financial integrity constraint failed'); END;

CREATE TRIGGER "Asset_integrity_insert" BEFORE INSERT ON "Asset"
WHEN typeof(NEW.purchaseValue) != 'integer' OR NEW.purchaseValue <= 0 OR NEW.purchaseValue > 2147483647
BEGIN SELECT RAISE(ABORT, 'Financial integrity constraint failed'); END;

CREATE TRIGGER "Asset_integrity_update" BEFORE UPDATE ON "Asset"
WHEN typeof(NEW.purchaseValue) != 'integer' OR NEW.purchaseValue <= 0 OR NEW.purchaseValue > 2147483647
BEGIN SELECT RAISE(ABORT, 'Financial integrity constraint failed'); END;

CREATE TRIGGER "AssetValuation_integrity_insert" BEFORE INSERT ON "AssetValuation"
WHEN typeof(NEW.value) != 'integer' OR NEW.value <= 0 OR NEW.value > 2147483647
BEGIN SELECT RAISE(ABORT, 'Financial integrity constraint failed'); END;

CREATE TRIGGER "AssetValuation_integrity_update" BEFORE UPDATE ON "AssetValuation"
WHEN typeof(NEW.value) != 'integer' OR NEW.value <= 0 OR NEW.value > 2147483647
BEGIN SELECT RAISE(ABORT, 'Financial integrity constraint failed'); END;

CREATE TRIGGER Transaction_linked_payment_guard BEFORE UPDATE ON "Transaction"
WHEN EXISTS (SELECT 1 FROM LoanPayment WHERE transactionId=OLD.id)
 AND (NEW.status!='ACTIVE' OR NEW.amount!=OLD.amount OR NEW.type!=OLD.type OR NEW.householdId!=OLD.householdId OR NEW.accountId!=OLD.accountId)
BEGIN SELECT RAISE(ABORT, 'Linked loan transaction cannot be changed independently'); END;
