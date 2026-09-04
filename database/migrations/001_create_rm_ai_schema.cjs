/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Relationship_Managers
  await knex.schema.createTable("Relationship_Managers", (table) => {
    table.increments("rm_id").primary();
    table.string("employee_code", 50).notNullable().unique();
    table.string("first_name", 100).notNullable();
    table.string("last_name", 100).notNullable();
    table.string("email", 255).nullable();
    table.string("team", 150).nullable();
    table.string("region", 100).nullable();
    table.string("role", 100).nullable();
    table.string("status", 50).nullable().defaultTo("Active");
    table.datetime2("created_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
  });

  // 2. Clients
  await knex.schema.createTable("Clients", (table) => {
    table.increments("client_id").primary();
    table.string("client_code", 50).notNullable().unique();
    table.string("first_name", 100).notNullable();
    table.string("last_name", 100).notNullable();
    table.date("date_of_birth").nullable();
    table.string("nationality", 100).nullable();
    table.string("client_segment", 50).nullable(); // HNWI / Affluent / Family Office / Other
    table.string("relationship_status", 50).nullable().defaultTo("Active");
    table.integer("FK_primary_rm_id").unsigned().nullable();
    table.datetime2("created_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.datetime2("updated_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.foreign("FK_primary_rm_id", "FK_Client_RM").references("rm_id").inTable("Relationship_Managers");
  });

  // 3. Households
  await knex.schema.createTable("Households", (table) => {
    table.increments("household_id").primary();
    table.string("household_name", 200).notNullable();
    table.string("household_type", 100).nullable(); // Family / Individual / Multi-generational / Other
    table.integer("primary_rm_id").unsigned().nullable();
    table.text("notes").nullable();
    table.datetime2("created_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.foreign("primary_rm_id", "FK_Household_RM").references("rm_id").inTable("Relationship_Managers");
  });

  // 4. Household_Members
  await knex.schema.createTable("Household_Members", (table) => {
    table.increments("household_member_id").primary();
    table.integer("household_id").unsigned().notNullable();
    table.integer("client_id").unsigned().notNullable();
    table.string("relationship_to_household", 100).nullable();
    table.decimal("ownership_percentage", 8, 4).nullable();
    table.boolean("is_primary_member").nullable().defaultTo(false);
    table.date("joined_date").nullable();
    table.date("left_date").nullable();
    table.unique(["household_id", "client_id"], { indexName: "UQ_Household_Client" });
    table.foreign("household_id", "FK_HouseholdMember_Household").references("household_id").inTable("Households").onDelete("CASCADE");
    table.foreign("client_id", "FK_HouseholdMember_Client").references("client_id").inTable("Clients").onDelete("CASCADE");
  });

  // 5. Client_Financial_Profile
  await knex.schema.createTable("Client_Financial_Profile", (table) => {
    table.increments("financial_profile_id").primary();
    table.integer("client_id").unsigned().notNullable().unique();
    table.decimal("total_aum", 20, 2).nullable().defaultTo(0);
    table.decimal("annual_revenue", 20, 2).nullable().defaultTo(0);
    table.decimal("estimated_net_worth", 20, 2).nullable();
    table.decimal("liquid_assets", 20, 2).nullable();
    table.decimal("total_liabilities", 20, 2).nullable();
    table.string("base_currency", 3).nullable().defaultTo("SGD");
    table.decimal("annual_income", 20, 2).nullable();
    table.datetime2("updated_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.foreign("client_id", "FK_FinancialProfile_Client").references("client_id").inTable("Clients").onDelete("CASCADE");
  });

  // 6. Client_External_Assets
  await knex.schema.createTable("Client_External_Assets", (table) => {
    table.increments("external_asset_id").primary();
    table.integer("client_id").unsigned().notNullable();
    table.string("asset_type", 100).notNullable(); // Property / Private Business / Private Equity / Art / Cash / Other
    table.string("description", 500).nullable();
    table.decimal("estimated_value", 20, 2).notNullable();
    table.string("currency", 3).nullable().defaultTo("SGD");
    table.string("liquidity_level", 50).nullable(); // Liquid / Semi-liquid / Illiquid
    table.decimal("ownership_percentage", 8, 4).nullable();
    table.date("acquisition_date").nullable();
    table.decimal("cost_basis", 20, 2).nullable();
    table.datetime2("updated_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.foreign("client_id", "FK_ExternalAssets_Client").references("client_id").inTable("Clients").onDelete("CASCADE");
  });

  // 7. Client_Liabilities
  await knex.schema.createTable("Client_Liabilities", (table) => {
    table.increments("liability_id").primary();
    table.integer("client_id").unsigned().notNullable();
    table.string("liability_type", 100).notNullable(); // Mortgage / Business Loan / Credit Facility / Other
    table.string("description", 500).nullable();
    table.decimal("outstanding_amount", 20, 2).notNullable();
    table.decimal("original_amount", 20, 2).nullable();
    table.decimal("interest_rate", 8, 4).nullable();
    table.date("maturity_date").nullable();
    table.string("currency", 3).nullable().defaultTo("SGD");
    table.datetime2("updated_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.foreign("client_id", "FK_Liabilities_Client").references("client_id").inTable("Clients").onDelete("CASCADE");
  });

  // 8. Client_Goals
  await knex.schema.createTable("Client_Goals", (table) => {
    table.increments("goal_id").primary();
    table.integer("client_id").unsigned().notNullable();
    table.string("goal_type", 100).notNullable(); // Retirement / Education / Wealth Growth / Wealth Preservation / Legacy / Succession / Philanthropy / Liquidity / Property / Business
    table.string("title", 200).notNullable();
    table.text("description").nullable();
    table.decimal("target_amount", 20, 2).nullable();
    table.string("currency", 3).nullable().defaultTo("SGD");
    table.date("target_date").nullable();
    table.string("priority", 50).nullable(); // Low / Medium / High / Critical
    table.string("status", 50).nullable().defaultTo("Active");
    table.datetime2("created_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.datetime2("updated_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.foreign("client_id", "FK_Goals_Client").references("client_id").inTable("Clients").onDelete("CASCADE");
  });

  // 9. Client_Risk_Profile
  await knex.schema.createTable("Client_Risk_Profile", (table) => {
    table.increments("risk_profile_id").primary();
    table.integer("client_id").unsigned().notNullable();
    table.string("risk_tolerance", 50).nullable(); // Low / Moderate / High
    table.string("risk_capacity", 50).nullable(); // Low / Moderate / High
    table.string("risk_requirement", 50).nullable(); // Low / Moderate / High
    table.string("investment_experience", 100).nullable();
    table.integer("investment_horizon_years").nullable();
    table.string("liquidity_requirement", 100).nullable();
    table.date("last_assessed_date").nullable();
    table.date("next_review_date").nullable();
    table.string("assessment_source", 100).nullable();
    table.text("notes").nullable();
    table.foreign("client_id", "FK_RiskProfile_Client").references("client_id").inTable("Clients").onDelete("CASCADE");
  });

  // 10. Investment_Preferences
  await knex.schema.createTable("Investment_Preferences", (table) => {
    table.increments("investment_preference_id").primary();
    table.integer("client_id").unsigned().notNullable();
    table.string("asset_type", 100).notNullable();
    table.string("preference", 50).notNullable(); // Preferred / Neutral / Avoid
    table.integer("preference_strength").nullable(); // 1 - 5
    table.text("reason").nullable();
    table.string("source", 100).nullable(); // Client / RM / Questionnaire / AI
    table.boolean("verified").nullable().defaultTo(false);
    table.datetime2("created_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.foreign("client_id", "FK_InvestmentPreference_Client").references("client_id").inTable("Clients").onDelete("CASCADE");
  });

  // 11. Client_Communication_Preferences
  await knex.schema.createTable("Client_Communication_Preferences", (table) => {
    table.increments("communication_preference_id").primary();
    table.integer("client_id").unsigned().notNullable().unique();
    table.string("preferred_channel", 100).nullable();
    table.string("preferred_time", 100).nullable();
    table.string("preferred_frequency", 100).nullable();
    table.text("communication_style").nullable();
    table.text("meeting_preferences").nullable();
    table.text("important_preferences").nullable();
    table.datetime2("updated_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.foreign("client_id", "FK_CommunicationPreference_Client").references("client_id").inTable("Clients").onDelete("CASCADE");
  });

  // 12. Persons
  await knex.schema.createTable("Persons", (table) => {
    table.increments("person_id").primary();
    table.string("first_name", 100).notNullable();
    table.string("last_name", 100).notNullable();
    table.date("date_of_birth").nullable();
    table.string("occupation", 200).nullable();
    table.string("contact_information", 500).nullable();
    table.datetime2("created_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
  });

  // 13. Client_Relationships
  await knex.schema.createTable("Client_Relationships", (table) => {
    table.increments("relationship_id").primary();
    table.integer("client_id").unsigned().notNullable();
    table.integer("related_person_id").unsigned().notNullable();
    table.string("relationship_type", 100).notNullable(); // Spouse / Child / Parent / Business Partner / Advisor / etc.
    table.string("relationship_strength", 50).nullable();
    table.date("start_date").nullable();
    table.date("end_date").nullable();
    table.text("notes").nullable();
    table.foreign("client_id", "FK_Relationship_Client").references("client_id").inTable("Clients").onDelete("CASCADE");
    table.foreign("related_person_id", "FK_Relationship_Person").references("person_id").inTable("Persons");
  });

  // 14. Investment_Assets
  await knex.schema.createTable("Investment_Assets", (table) => {
    table.increments("asset_id").primary();
    table.string("asset_name", 200).notNullable();
    table.string("asset_type", 100).notNullable(); // Equity / Bond / ETF / Fund / Structured Product / etc.
    table.string("ticker", 50).nullable();
    table.string("isin", 50).nullable();
    table.string("currency", 3).nullable();
    table.string("issuer", 200).nullable();
    table.string("country", 100).nullable();
    table.string("sector", 100).nullable();
    table.string("underlying_reference", 200).nullable();
    table.string("sub_asset_class", 100).nullable();
    table.string("liquidity_tier", 50).nullable();
    table.boolean("concentration_limit_applies").notNullable().defaultTo(false);
    table.datetime2("created_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
  });

  // 15. Portfolios
  await knex.schema.createTable("Portfolios", (table) => {
    table.increments("portfolio_id").primary();
    table.integer("client_id").unsigned().notNullable();
    table.string("portfolio_name", 200).notNullable();
    table.string("portfolio_type", 100).nullable(); // Advisory / Discretionary / Execution
    table.string("risk_level", 50).nullable();
    table.decimal("total_value", 20, 2).nullable().defaultTo(0);
    table.string("currency", 3).nullable().defaultTo("SGD");
    table.datetime2("created_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.datetime2("updated_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.foreign("client_id", "FK_Portfolio_Client").references("client_id").inTable("Clients").onDelete("CASCADE");
  });

  // 16. Mandates
  await knex.schema.createTable("Mandates", (table) => {
    table.increments("mandate_id").primary();
    table.integer("portfolio_id").unsigned().notNullable();
    table.string("mandate_code", 50).notNullable();
    table.string("mandate_name", 200).nullable();
    table.string("asset_class", 100).notNullable();
    table.decimal("min_pct", 8, 4).nullable();
    table.decimal("target_pct", 8, 4).nullable();
    table.decimal("max_pct", 8, 4).nullable();
    table.decimal("max_single_position_pct", 8, 4).nullable();
    table.text("mandate_notes").nullable();
    table.datetime2("created_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.foreign("portfolio_id", "FK_Mandate_Portfolio").references("portfolio_id").inTable("Portfolios").onDelete("CASCADE");
  });

  // 17. Portfolio_Holdings
  await knex.schema.createTable("Portfolio_Holdings", (table) => {
    table.bigIncrements("holding_id").primary();
    table.integer("portfolio_id").unsigned().notNullable();
    table.integer("asset_id").unsigned().notNullable();
    table.date("snapshot_date").notNullable();
    table.decimal("quantity", 20, 8).nullable();
    table.decimal("market_value", 20, 2).nullable();
    table.string("currency", 3).nullable().defaultTo("SGD");
    table.decimal("allocation_percentage", 8, 4).nullable();
    table.decimal("cost_basis", 20, 2).nullable();
    table.decimal("average_purchase_price", 20, 8).nullable();
    table.date("acquisition_date").nullable();
    table.decimal("unrealised_gain_loss", 20, 2).nullable();
    table.decimal("unrealised_gain_loss_percentage", 8, 4).nullable();
    table.datetime2("updated_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.unique(["portfolio_id", "asset_id", "snapshot_date"], { indexName: "UQ_Holdings_Portfolio_Asset_Snapshot" });
    table.foreign("portfolio_id", "FK_Holding_Portfolio").references("portfolio_id").inTable("Portfolios").onDelete("CASCADE");
    table.foreign("asset_id", "FK_Holding_Asset").references("asset_id").inTable("Investment_Assets");
  });

  // 18. Transactions
  await knex.schema.createTable("Transactions", (table) => {
    table.bigIncrements("transaction_id").primary();
    table.integer("client_id").unsigned().notNullable();
    table.integer("portfolio_id").unsigned().nullable();
    table.integer("asset_id").unsigned().nullable();
    table.string("transaction_type", 100).notNullable(); // Buy / Sell / Deposit / Withdrawal / Transfer
    table.decimal("quantity", 20, 8).nullable();
    table.decimal("amount", 20, 2).notNullable();
    table.string("currency", 3).nullable().defaultTo("SGD");
    table.datetime2("transaction_date").notNullable();
    table.string("description", 500).nullable();
    table.datetime2("created_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.foreign("client_id", "FK_Transaction_Client").references("client_id").inTable("Clients").onDelete("CASCADE");
    table.foreign("portfolio_id", "FK_Transaction_Portfolio").references("portfolio_id").inTable("Portfolios");
    table.foreign("asset_id", "FK_Transaction_Asset").references("asset_id").inTable("Investment_Assets");
  });

  // 19. Client_Events
  await knex.schema.createTable("Client_Events", (table) => {
    table.bigIncrements("event_id").primary();
    table.integer("client_id").unsigned().notNullable();
    table.string("event_type", 100).notNullable(); // Business Sale / Inheritance / Retirement / Property Purchase / Marriage / Relocation / Liquidity Event / IPO / Education / Other
    table.string("title", 200).notNullable();
    table.date("event_date").nullable();
    table.date("expected_date").nullable();
    table.text("description").nullable();
    table.decimal("estimated_value", 20, 2).nullable();
    table.string("currency", 3).nullable().defaultTo("SGD");
    table.string("urgency", 50).nullable();
    table.string("impact_level", 50).nullable();
    table.string("status", 50).nullable().defaultTo("Open");
    table.string("source", 100).nullable();
    table.datetime2("created_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.foreign("client_id", "FK_Event_Client").references("client_id").inTable("Clients").onDelete("CASCADE");
  });

  // 20. Meetings
  await knex.schema.createTable("Meetings", (table) => {
    table.bigIncrements("meeting_id").primary();
    table.integer("client_id").unsigned().notNullable();
    table.integer("rm_id").unsigned().nullable();
    table.datetime2("meeting_date").notNullable();
    table.string("meeting_type", 100).nullable(); // In-person / Video / Phone
    table.string("subject", 300).nullable();
    table.text("summary").nullable();
    table.boolean("follow_up_required").nullable().defaultTo(false);
    table.date("follow_up_date").nullable();
    table.datetime2("created_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.foreign("client_id", "FK_Meeting_Client").references("client_id").inTable("Clients").onDelete("CASCADE");
    table.foreign("rm_id", "FK_Meeting_RM").references("rm_id").inTable("Relationship_Managers");
  });

  // 21. RM_Knowledge
  await knex.schema.createTable("RM_Knowledge", (table) => {
    table.bigIncrements("knowledge_id").primary();
    table.integer("client_id").unsigned().notNullable();
    table.integer("rm_id").unsigned().nullable();
    table.string("knowledge_type", 100).notNullable(); // Preference / Observation / Client Statement / Strategy / Family / Business / Behaviour / Other
    table.string("title", 300).notNullable();
    table.text("content").notNullable();
    table.string("source_type", 100).nullable(); // Client / RM / Meeting / Email / Document / AI
    table.decimal("confidence_score", 5, 2).nullable();
    table.boolean("verified").nullable().defaultTo(false);
    table.integer("verified_by_rm_id").unsigned().nullable();
    table.datetime2("verified_at").nullable();
    table.string("importance", 50).nullable();
    table.date("expiry_date").nullable();
    table.datetime2("created_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.datetime2("updated_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.foreign("client_id", "FK_Knowledge_Client").references("client_id").inTable("Clients").onDelete("CASCADE");
    table.foreign("rm_id", "FK_Knowledge_RM").references("rm_id").inTable("Relationship_Managers");
    table.foreign("verified_by_rm_id", "FK_Knowledge_VerifiedBy").references("rm_id").inTable("Relationship_Managers");
  });

  // 22. Client_Tax_Profiles
  await knex.schema.createTable("Client_Tax_Profiles", (table) => {
    table.bigIncrements("tax_profile_id").primary();
    table.integer("client_id").unsigned().notNullable();
    table.string("tax_jurisdiction", 100).notNullable();
    table.string("tax_residency_status", 100).nullable();
    table.string("tax_domicile", 100).nullable();
    table.string("tax_identification_country", 100).nullable();
    table.string("capital_gains_tax_status", 200).nullable();
    table.string("estate_tax_status", 200).nullable();
    table.string("withholding_tax_status", 200).nullable();
    table.integer("tax_year").nullable();
    table.date("effective_from").nullable();
    table.date("effective_to").nullable();
    table.text("notes").nullable();
    table.string("source", 100).nullable();
    table.boolean("verified").nullable().defaultTo(false);
    table.datetime2("created_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.foreign("client_id", "FK_TaxProfile_Client").references("client_id").inTable("Clients").onDelete("CASCADE");
  });

  // 23. Client_Liquidity_Profile
  await knex.schema.createTable("Client_Liquidity_Profile", (table) => {
    table.increments("liquidity_profile_id").primary();
    table.integer("client_id").unsigned().notNullable().unique();
    table.decimal("immediate_liquidity", 20, 2).nullable().defaultTo(0);
    table.decimal("short_term_liquidity", 20, 2).nullable().defaultTo(0);
    table.decimal("illiquid_assets", 20, 2).nullable().defaultTo(0);
    table.decimal("expected_cash_needs", 20, 2).nullable().defaultTo(0);
    table.decimal("minimum_cash_reserve", 20, 2).nullable().defaultTo(0);
    table.string("currency", 3).nullable().defaultTo("SGD");
    table.datetime2("updated_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.foreign("client_id", "FK_Liquidity_Client").references("client_id").inTable("Clients").onDelete("CASCADE");
  });

  // 24. KYC_Reviews
  await knex.schema.createTable("KYC_Reviews", (table) => {
    table.bigIncrements("review_id").primary();
    table.integer("client_id").unsigned().notNullable();
    table.integer("reviewed_by_rm_id").unsigned().nullable();
    table.date("review_date").notNullable();
    table.string("status", 50).nullable();
    table.date("next_review_date").nullable();
    table.text("source_of_wealth").nullable();
    table.text("source_of_funds").nullable();
    table.string("tax_residency", 200).nullable();
    table.string("regulatory_classification", 100).nullable();
    table.boolean("pep_status").nullable().defaultTo(false);
    table.string("sanctions_screening_status", 50).nullable();
    table.string("suitability_status", 50).nullable();
    table.string("documentation_status", 50).nullable();
    table.text("notes").nullable();
    table.foreign("client_id", "FK_KYC_Client").references("client_id").inTable("Clients").onDelete("CASCADE");
    table.foreign("reviewed_by_rm_id", "FK_KYC_RM").references("rm_id").inTable("Relationship_Managers");
  });

  // 25. Priority_Assessments
  await knex.schema.createTable("Priority_Assessments", (table) => {
    table.bigIncrements("assessment_id").primary();
    table.integer("client_id").unsigned().notNullable();
    table.decimal("client_value_score", 5, 2).notNullable();
    table.decimal("attention_need_score", 5, 2).notNullable();
    table.decimal("overall_priority_score", 5, 2).notNullable();
    table.text("priority_reason").nullable();
    table.text("recommended_action").nullable();
    table.string("model_version", 100).nullable();
    table.datetime2("calculated_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.foreign("client_id", "FK_Priority_Client").references("client_id").inTable("Clients").onDelete("CASCADE");
  });

  // 26. RM_Actions
  await knex.schema.createTable("RM_Actions", (table) => {
    table.bigIncrements("action_id").primary();
    table.integer("client_id").unsigned().notNullable();
    table.integer("rm_id").unsigned().nullable();
    table.bigInteger("event_id").unsigned().nullable();
    table.bigInteger("assessment_id").unsigned().nullable();
    table.string("action_type", 100).notNullable(); // Contact Client / Portfolio Review / Schedule Meeting / Follow Up / Compliance Review / Investment Proposal / Other
    table.string("title", 300).notNullable();
    table.text("description").nullable();
    table.string("priority", 50).nullable();
    table.date("due_date").nullable();
    table.string("status", 50).nullable().defaultTo("Open");
    table.datetime2("completed_at").nullable();
    table.datetime2("created_at").nullable().defaultTo(knex.raw("SYSDATETIME()"));
    table.foreign("client_id", "FK_Action_Client").references("client_id").inTable("Clients").onDelete("CASCADE");
    table.foreign("rm_id", "FK_Action_RM").references("rm_id").inTable("Relationship_Managers");
    table.foreign("event_id", "FK_Action_Event").references("event_id").inTable("Client_Events");
    table.foreign("assessment_id", "FK_Action_Assessment").references("assessment_id").inTable("Priority_Assessments");
  });

  // ============================================================
  // INDEXES
  // ============================================================

  await knex.schema.table("Clients", (table) => {
    table.index("FK_primary_rm_id", "IX_Clients_RM");
  });

  await knex.schema.table("Household_Members", (table) => {
    table.index("client_id", "IX_HouseholdMembers_Client");
    table.index("household_id", "IX_HouseholdMembers_Household");
  });

  await knex.schema.table("Client_External_Assets", (table) => {
    table.index("client_id", "IX_Assets_Client");
  });

  await knex.schema.table("Client_Liabilities", (table) => {
    table.index("client_id", "IX_Liabilities_Client");
  });

  await knex.schema.table("Client_Goals", (table) => {
    table.index("client_id", "IX_Goals_Client");
  });

  await knex.schema.table("Portfolios", (table) => {
    table.index("client_id", "IX_Portfolios_Client");
  });

  await knex.schema.table("Portfolio_Holdings", (table) => {
    table.index("portfolio_id", "IX_Holdings_Portfolio");
    table.index("asset_id", "IX_Holdings_Asset");
    table.index("snapshot_date", "IX_Holdings_Snapshot");
    table.index(["portfolio_id", "snapshot_date"], "IX_Holdings_Portfolio_Snapshot");
  });

  await knex.schema.table("Transactions", (table) => {
    table.index(["client_id", "transaction_date"], "IX_Transactions_Client_Date");
  });

  await knex.schema.table("Client_Events", (table) => {
    table.index(["client_id", "event_date"], "IX_Events_Client_Date");
    table.index("expected_date", "IX_Events_Expected_Date");
  });

  await knex.schema.table("Meetings", (table) => {
    table.index(["client_id", "meeting_date"], "IX_Meetings_Client_Date");
  });

  await knex.schema.table("RM_Knowledge", (table) => {
    table.index(["client_id", "created_at"], "IX_Knowledge_Client_Date");
  });

  await knex.schema.table("Client_Tax_Profiles", (table) => {
    table.index(["client_id", "effective_from"], "IX_Tax_Client_Date");
  });

  await knex.schema.table("Priority_Assessments", (table) => {
    table.index(["client_id", "calculated_at"], "IX_Priority_Client_Date");
    table.index("overall_priority_score", "IX_Priority_Score");
  });

  await knex.schema.table("RM_Actions", (table) => {
    table.index(["rm_id", "status"], "IX_Actions_RM_Status");
    table.index("due_date", "IX_Actions_DueDate");
  });

  await knex.schema.table("Mandates", (table) => {
    table.index("portfolio_id", "IX_Mandates_Portfolio");
  });

  await knex.schema.table("Investment_Assets", (table) => {
    table.index("underlying_reference", "IX_Assets_UnderlyingReference");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Drop in reverse dependency order
  await knex.schema.dropTableIfExists("RM_Actions");
  await knex.schema.dropTableIfExists("Priority_Assessments");
  await knex.schema.dropTableIfExists("KYC_Reviews");
  await knex.schema.dropTableIfExists("Client_Liquidity_Profile");
  await knex.schema.dropTableIfExists("Client_Tax_Profiles");
  await knex.schema.dropTableIfExists("RM_Knowledge");
  await knex.schema.dropTableIfExists("Meetings");
  await knex.schema.dropTableIfExists("Client_Events");
  await knex.schema.dropTableIfExists("Transactions");
  await knex.schema.dropTableIfExists("Portfolio_Holdings");
  await knex.schema.dropTableIfExists("Mandates");
  await knex.schema.dropTableIfExists("Portfolios");
  await knex.schema.dropTableIfExists("Investment_Assets");
  await knex.schema.dropTableIfExists("Client_Relationships");
  await knex.schema.dropTableIfExists("Persons");
  await knex.schema.dropTableIfExists("Client_Communication_Preferences");
  await knex.schema.dropTableIfExists("Investment_Preferences");
  await knex.schema.dropTableIfExists("Client_Risk_Profile");
  await knex.schema.dropTableIfExists("Client_Goals");
  await knex.schema.dropTableIfExists("Client_Liabilities");
  await knex.schema.dropTableIfExists("Client_External_Assets");
  await knex.schema.dropTableIfExists("Client_Financial_Profile");
  await knex.schema.dropTableIfExists("Household_Members");
  await knex.schema.dropTableIfExists("Households");
  await knex.schema.dropTableIfExists("Clients");
  await knex.schema.dropTableIfExists("Relationship_Managers");
};