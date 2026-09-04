/**
 * RM AI Assistant - Initial Database Schema
 *
 * Database: Microsoft SQL Server
 * Knex client: mssql
 *
 * Run:
 *   npx knex migrate:latest
 *
 * Rollback:
 *   npx knex migrate:rollback
 */

exports.up = async function (knex) {
  // ============================================================
  // 1. RELATIONSHIP MANAGERS
  // ============================================================

  await knex.schema.createTable('Relationship_Managers', (table) => {
    table.increments('rm_id').primary();

    table.string('employee_code', 50).notNullable().unique();

    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();

    table.string('email', 255).nullable();
    table.string('team', 150).nullable();
    table.string('region', 100).nullable();
    table.string('role', 100).nullable();

    table.string('status', 50).defaultTo('Active');

    table.dateTime2('created_at').defaultTo(knex.fn.now());
  });

  // ============================================================
  // 2. CLIENTS
  // ============================================================

  await knex.schema.createTable('Clients', (table) => {
    table.increments('client_id').primary();

    table.string('client_code', 50).notNullable().unique();

    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();

    table.date('date_of_birth').nullable();

    table.string('nationality', 100).nullable();

    table.string('client_segment', 50).nullable();

    table.string('relationship_status', 50).defaultTo('Active');

    table.integer('FK_primary_rm_id').nullable();

    table.dateTime2('created_at').defaultTo(knex.fn.now());
    table.dateTime2('updated_at').defaultTo(knex.fn.now());

    table
      .foreign('FK_primary_rm_id')
      .references('rm_id')
      .inTable('Relationship_Managers');
  });

  // ============================================================
  // 3. HOUSEHOLDS
  // ============================================================

  await knex.schema.createTable('Households', (table) => {
    table.increments('household_id').primary();

    table.string('household_name', 200).notNullable();

    table.string('household_type', 100).nullable();

    table.integer('primary_rm_id').nullable();

    table.text('notes').nullable();

    table.dateTime2('created_at').defaultTo(knex.fn.now());

    table
      .foreign('primary_rm_id')
      .references('rm_id')
      .inTable('Relationship_Managers');
  });

  // ============================================================
  // 4. HOUSEHOLD MEMBERS
  // ============================================================

  await knex.schema.createTable('Household_Members', (table) => {
    table.increments('household_member_id').primary();

    table.integer('household_id').notNullable();
    table.integer('client_id').notNullable();

    table.string('relationship_to_household', 100).nullable();

    table.decimal('ownership_percentage', 8, 4).nullable();

    table.boolean('is_primary_member').defaultTo(false);

    table.date('joined_date').nullable();
    table.date('left_date').nullable();

    table
      .foreign('household_id')
      .references('household_id')
      .inTable('Households')
      .onDelete('CASCADE');

    table
      .foreign('client_id')
      .references('client_id')
      .inTable('Clients')
      .onDelete('CASCADE');

    table.unique(['household_id', 'client_id']);
  });

  // ============================================================
  // 5. CLIENT FINANCIAL PROFILE
  // ============================================================

  await knex.schema.createTable('Client_Financial_Profile', (table) => {
    table.increments('financial_profile_id').primary();

    table.integer('client_id').notNullable().unique();

    table.decimal('total_aum', 20, 2).defaultTo(0);
    table.decimal('annual_revenue', 20, 2).defaultTo(0);
    table.decimal('estimated_net_worth', 20, 2).nullable();
    table.decimal('liquid_assets', 20, 2).nullable();
    table.decimal('total_liabilities', 20, 2).nullable();

    table.string('base_currency', 3).defaultTo('SGD');

    table.decimal('annual_income', 20, 2).nullable();

    table.dateTime2('updated_at').defaultTo(knex.fn.now());

    table
      .foreign('client_id')
      .references('client_id')
      .inTable('Clients')
      .onDelete('CASCADE');
  });

  // ============================================================
  // 6. EXTERNAL CLIENT ASSETS
  // ============================================================

  await knex.schema.createTable('Client_External_Assets', (table) => {
    table.increments('external_asset_id').primary();

    table.integer('client_id').notNullable();

    table.string('asset_type', 100).notNullable();

    table.string('description', 500).nullable();

    table.decimal('estimated_value', 20, 2).notNullable();

    table.string('currency', 3).defaultTo('SGD');

    table.string('liquidity_level', 50).nullable();

    table.decimal('ownership_percentage', 8, 4).nullable();

    table.date('acquisition_date').nullable();

    table.decimal('cost_basis', 20, 2).nullable();

    table.dateTime2('updated_at').defaultTo(knex.fn.now());

    table
      .foreign('client_id')
      .references('client_id')
      .inTable('Clients')
      .onDelete('CASCADE');
  });

  // ============================================================
  // 7. LIABILITIES
  // ============================================================

  await knex.schema.createTable('Client_Liabilities', (table) => {
    table.increments('liability_id').primary();

    table.integer('client_id').notNullable();

    table.string('liability_type', 100).notNullable();

    table.string('description', 500).nullable();

    table.decimal('outstanding_amount', 20, 2).notNullable();

    table.decimal('original_amount', 20, 2).nullable();

    table.decimal('interest_rate', 8, 4).nullable();

    table.date('maturity_date').nullable();

    table.string('currency', 3).defaultTo('SGD');

    table.dateTime2('updated_at').defaultTo(knex.fn.now());

    table
      .foreign('client_id')
      .references('client_id')
      .inTable('Clients')
      .onDelete('CASCADE');
  });

  // ============================================================
  // 8. CLIENT GOALS
  // ============================================================

  await knex.schema.createTable('Client_Goals', (table) => {
    table.increments('goal_id').primary();

    table.integer('client_id').notNullable();

    table.string('goal_type', 100).notNullable();

    table.string('title', 200).notNullable();

    table.text('description').nullable();

    table.decimal('target_amount', 20, 2).nullable();

    table.string('currency', 3).defaultTo('SGD');

    table.date('target_date').nullable();

    table.string('priority', 50).nullable();

    table.string('status', 50).defaultTo('Active');

    table.dateTime2('created_at').defaultTo(knex.fn.now());
    table.dateTime2('updated_at').defaultTo(knex.fn.now());

    table
      .foreign('client_id')
      .references('client_id')
      .inTable('Clients')
      .onDelete('CASCADE');
  });

  // ============================================================
  // 9. CLIENT RISK PROFILE
  // ============================================================

  await knex.schema.createTable('Client_Risk_Profile', (table) => {
    table.increments('risk_profile_id').primary();

    table.integer('client_id').notNullable();

    table.string('risk_tolerance', 50).nullable();
    table.string('risk_capacity', 50).nullable();
    table.string('risk_requirement', 50).nullable();

    table.string('investment_experience', 100).nullable();

    table.integer('investment_horizon_years').nullable();

    table.string('liquidity_requirement', 100).nullable();

    table.date('last_assessed_date').nullable();
    table.date('next_review_date').nullable();

    table.string('assessment_source', 100).nullable();

    table.text('notes').nullable();

    table
      .foreign('client_id')
      .references('client_id')
      .inTable('Clients')
      .onDelete('CASCADE');
  });

  // ============================================================
  // 10. INVESTMENT PREFERENCES
  // ============================================================

  await knex.schema.createTable('Investment_Preferences', (table) => {
    table.increments('investment_preference_id').primary();

    table.integer('client_id').notNullable();

    table.string('asset_type', 100).notNullable();

    table.string('preference', 50).notNullable();

    table.integer('preference_strength').nullable();

    table.text('reason').nullable();

    table.string('source', 100).nullable();

    table.boolean('verified').defaultTo(false);

    table.dateTime2('created_at').defaultTo(knex.fn.now());

    table
      .foreign('client_id')
      .references('client_id')
      .inTable('Clients')
      .onDelete('CASCADE');
  });

  // ============================================================
  // 11. COMMUNICATION PREFERENCES
  // ============================================================

  await knex.schema.createTable(
    'Client_Communication_Preferences',
    (table) => {
      table.increments('communication_preference_id').primary();

      table.integer('client_id').notNullable().unique();

      table.string('preferred_channel', 100).nullable();

      table.string('preferred_time', 100).nullable();

      table.string('preferred_frequency', 100).nullable();

      table.text('communication_style').nullable();

      table.text('meeting_preferences').nullable();

      table.text('important_preferences').nullable();

      table.dateTime2('updated_at').defaultTo(knex.fn.now());

      table
        .foreign('client_id')
        .references('client_id')
        .inTable('Clients')
        .onDelete('CASCADE');
    }
  );

  // ============================================================
  // 12. PERSONS
  // ============================================================

  await knex.schema.createTable('Persons', (table) => {
    table.increments('person_id').primary();

    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();

    table.date('date_of_birth').nullable();

    table.string('occupation', 200).nullable();

    table.string('contact_information', 500).nullable();

    table.dateTime2('created_at').defaultTo(knex.fn.now());
  });

  // ============================================================
  // 13. CLIENT RELATIONSHIPS
  // ============================================================

  await knex.schema.createTable('Client_Relationships', (table) => {
    table.increments('relationship_id').primary();

    table.integer('client_id').notNullable();

    table.integer('related_person_id').notNullable();

    table.string('relationship_type', 100).notNullable();

    table.string('relationship_strength', 50).nullable();

    table.date('start_date').nullable();
    table.date('end_date').nullable();

    table.text('notes').nullable();

    table
      .foreign('client_id')
      .references('client_id')
      .inTable('Clients')
      .onDelete('CASCADE');

    table
      .foreign('related_person_id')
      .references('person_id')
      .inTable('Persons');
  });

  // ============================================================
  // 14. INVESTMENT ASSETS
  // ============================================================

  await knex.schema.createTable('Investment_Assets', (table) => {
    table.increments('asset_id').primary();

    table.string('asset_name', 200).notNullable();

    table.string('asset_type', 100).notNullable();

    table.string('ticker', 50).nullable();

    table.string('isin', 50).nullable();

    table.string('currency', 3).nullable();

    table.string('issuer', 200).nullable();

    table.string('country', 100).nullable();

    table.string('sector', 100).nullable();

    table.dateTime2('created_at').defaultTo(knex.fn.now());
  });

  // ============================================================
  // 15. PORTFOLIOS
  // ============================================================

  await knex.schema.createTable('Portfolios', (table) => {
    table.increments('portfolio_id').primary();

    table.integer('client_id').notNullable();

    table.string('portfolio_name', 200).notNullable();

    table.string('portfolio_type', 100).nullable();

    table.string('risk_level', 50).nullable();

    table.decimal('total_value', 20, 2).defaultTo(0);

    table.string('currency', 3).defaultTo('SGD');

    table.dateTime2('created_at').defaultTo(knex.fn.now());
    table.dateTime2('updated_at').defaultTo(knex.fn.now());

    table
      .foreign('client_id')
      .references('client_id')
      .inTable('Clients')
      .onDelete('CASCADE');
  });

  // ============================================================
  // 16. PORTFOLIO HOLDINGS
  // ============================================================

  await knex.schema.createTable('Portfolio_Holdings', (table) => {
    table.bigIncrements('holding_id').primary();

    table.integer('portfolio_id').notNullable();

    table.integer('asset_id').notNullable();

    table.decimal('quantity', 20, 8).nullable();

    table.decimal('market_value', 20, 2).nullable();

    table.string('currency', 3).defaultTo('SGD');

    table.decimal('allocation_percentage', 8, 4).nullable();

    table.decimal('cost_basis', 20, 2).nullable();

    table.decimal('average_purchase_price', 20, 8).nullable();

    table.date('acquisition_date').nullable();

    table.decimal('unrealised_gain_loss', 20, 2).nullable();

    table
      .decimal('unrealised_gain_loss_percentage', 8, 4)
      .nullable();

    table.dateTime2('updated_at').defaultTo(knex.fn.now());

    table
      .foreign('portfolio_id')
      .references('portfolio_id')
      .inTable('Portfolios')
      .onDelete('CASCADE');

    table
      .foreign('asset_id')
      .references('asset_id')
      .inTable('Investment_Assets');
  });

  // ============================================================
  // 17. TRANSACTIONS
  // ============================================================

  await knex.schema.createTable('Transactions', (table) => {
    table.bigIncrements('transaction_id').primary();

    table.integer('client_id').notNullable();

    table.integer('portfolio_id').nullable();

    table.integer('asset_id').nullable();

    table.string('transaction_type', 100).notNullable();

    table.decimal('quantity', 20, 8).nullable();

    table.decimal('amount', 20, 2).notNullable();

    table.string('currency', 3).defaultTo('SGD');

    table.dateTime2('transaction_date').notNullable();

    table.string('description', 500).nullable();

    table.dateTime2('created_at').defaultTo(knex.fn.now());

    table
      .foreign('client_id')
      .references('client_id')
      .inTable('Clients')
      .onDelete('CASCADE');

    table
      .foreign('portfolio_id')
      .references('portfolio_id')
      .inTable('Portfolios');

    table
      .foreign('asset_id')
      .references('asset_id')
      .inTable('Investment_Assets');
  });

  // ============================================================
  // 18. CLIENT EVENTS
  // ============================================================

  await knex.schema.createTable('Client_Events', (table) => {
    table.bigIncrements('event_id').primary();

    table.integer('client_id').notNullable();

    table.string('event_type', 100).notNullable();

    table.string('title', 200).notNullable();

    table.date('event_date').nullable();

    table.date('expected_date').nullable();

    table.text('description').nullable();

    table.decimal('estimated_value', 20, 2).nullable();

    table.string('currency', 3).defaultTo('SGD');

    table.string('urgency', 50).nullable();

    table.string('impact_level', 50).nullable();

    table.string('status', 50).defaultTo('Open');

    table.string('source', 100).nullable();

    table.dateTime2('created_at').defaultTo(knex.fn.now());

    table
      .foreign('client_id')
      .references('client_id')
      .inTable('Clients')
      .onDelete('CASCADE');
  });

  // ============================================================
  // 19. MEETINGS
  // ============================================================

  await knex.schema.createTable('Meetings', (table) => {
    table.bigIncrements('meeting_id').primary();

    table.integer('client_id').notNullable();

    table.integer('rm_id').nullable();

    table.dateTime2('meeting_date').notNullable();

    table.string('meeting_type', 100).nullable();

    table.string('subject', 300).nullable();

    table.text('summary').nullable();

    table.boolean('follow_up_required').defaultTo(false);

    table.date('follow_up_date').nullable();

    table.dateTime2('created_at').defaultTo(knex.fn.now());

    table
      .foreign('client_id')
      .references('client_id')
      .inTable('Clients')
      .onDelete('CASCADE');

    table
      .foreign('rm_id')
      .references('rm_id')
      .inTable('Relationship_Managers');
  });

  // ============================================================
  // 20. RM KNOWLEDGE
  // ============================================================

  await knex.schema.createTable('RM_Knowledge', (table) => {
    table.bigIncrements('knowledge_id').primary();

    table.integer('client_id').notNullable();

    table.integer('rm_id').nullable();

    table.string('knowledge_type', 100).notNullable();

    table.string('title', 300).notNullable();

    table.text('content').notNullable();

    table.string('source_type', 100).nullable();

    table.decimal('confidence_score', 5, 2).nullable();

    table.boolean('verified').defaultTo(false);

    table.integer('verified_by_rm_id').nullable();

    table.dateTime2('verified_at').nullable();

    table.string('importance', 50).nullable();

    table.date('expiry_date').nullable();

    table.dateTime2('created_at').defaultTo(knex.fn.now());

    table.dateTime2('updated_at').defaultTo(knex.fn.now());

    table
      .foreign('client_id')
      .references('client_id')
      .inTable('Clients')
      .onDelete('CASCADE');

    table
      .foreign('rm_id')
      .references('rm_id')
      .inTable('Relationship_Managers');

    table
      .foreign('verified_by_rm_id')
      .references('rm_id')
      .inTable('Relationship_Managers');
  });

  // ============================================================
  // 21. TAX PROFILES
  // ============================================================

  await knex.schema.createTable('Client_Tax_Profiles', (table) => {
    table.bigIncrements('tax_profile_id').primary();

    table.integer('client_id').notNullable();

    table.string('tax_jurisdiction', 100).notNullable();

    table.string('tax_residency_status', 100).nullable();

    table.string('tax_domicile', 100).nullable();

    table.string('tax_identification_country', 100).nullable();

    table.string('capital_gains_tax_status', 200).nullable();

    table.string('estate_tax_status', 200).nullable();

    table.string('withholding_tax_status', 200).nullable();

    table.integer('tax_year').nullable();

    table.date('effective_from').nullable();

    table.date('effective_to').nullable();

    table.text('notes').nullable();

    table.string('source', 100).nullable();

    table.boolean('verified').defaultTo(false);

    table.dateTime2('created_at').defaultTo(knex.fn.now());

    table
      .foreign('client_id')
      .references('client_id')
      .inTable('Clients')
      .onDelete('CASCADE');
  });

  // ============================================================
  // 22. LIQUIDITY PROFILE
  // ============================================================

  await knex.schema.createTable('Client_Liquidity_Profile', (table) => {
    table.increments('liquidity_profile_id').primary();

    table.integer('client_id').notNullable().unique();

    table.decimal('immediate_liquidity', 20, 2).defaultTo(0);

    table.decimal('short_term_liquidity', 20, 2).defaultTo(0);

    table.decimal('illiquid_assets', 20, 2).defaultTo(0);

    table.decimal('expected_cash_needs', 20, 2).defaultTo(0);

    table.decimal('minimum_cash_reserve', 20, 2).defaultTo(0);

    table.string('currency', 3).defaultTo('SGD');

    table.dateTime2('updated_at').defaultTo(knex.fn.now());

    table
      .foreign('client_id')
      .references('client_id')
      .inTable('Clients')
      .onDelete('CASCADE');
  });

  // ============================================================
  // 23. KYC REVIEWS
  // ============================================================

  await knex.schema.createTable('KYC_Reviews', (table) => {
    table.bigIncrements('review_id').primary();

    table.integer('client_id').notNullable();

    table.integer('reviewed_by_rm_id').nullable();

    table.date('review_date').notNullable();

    table.string('status', 50).nullable();

    table.date('next_review_date').nullable();

    table.text('source_of_wealth').nullable();

    table.text('source_of_funds').nullable();

    table.string('tax_residency', 200).nullable();

    table.string('regulatory_classification', 100).nullable();

    table.boolean('pep_status').defaultTo(false);

    table.string('sanctions_screening_status', 50).nullable();

    table.string('suitability_status', 50).nullable();

    table.string('documentation_status', 50).nullable();

    table.text('notes').nullable();

    table
      .foreign('client_id')
      .references('client_id')
      .inTable('Clients')
      .onDelete('CASCADE');

    table
      .foreign('reviewed_by_rm_id')
      .references('rm_id')
      .inTable('Relationship_Managers');
  });

  // ============================================================
  // 24. PRIORITY ASSESSMENTS
  // ============================================================

  await knex.schema.createTable('Priority_Assessments', (table) => {
    table.bigIncrements('assessment_id').primary();

    table.integer('client_id').notNullable();

    table.decimal('client_value_score', 5, 2).notNullable();

    table.decimal('attention_need_score', 5, 2).notNullable();

    table.decimal('overall_priority_score', 5, 2).notNullable();

    table.text('priority_reason').nullable();

    table.text('recommended_action').nullable();

    table.string('model_version', 100).nullable();

    table.dateTime2('calculated_at').defaultTo(knex.fn.now());

    table
      .foreign('client_id')
      .references('client_id')
      .inTable('Clients')
      .onDelete('CASCADE');
  });

  // ============================================================
  // 25. RM ACTIONS
  // ============================================================

  await knex.schema.createTable('RM_Actions', (table) => {
    table.bigIncrements('action_id').primary();

    table.integer('client_id').notNullable();

    table.integer('rm_id').nullable();

    table.bigInteger('event_id').nullable();

    table.bigInteger('assessment_id').nullable();

    table.string('action_type', 100).notNullable();

    table.string('title', 300).notNullable();

    table.text('description').nullable();

    table.string('priority', 50).nullable();

    table.date('due_date').nullable();

    table.string('status', 50).defaultTo('Open');

    table.dateTime2('completed_at').nullable();

    table.dateTime2('created_at').defaultTo(knex.fn.now());

    table
      .foreign('client_id')
      .references('client_id')
      .inTable('Clients')
      .onDelete('CASCADE');

    table
      .foreign('rm_id')
      .references('rm_id')
      .inTable('Relationship_Managers');

    table
      .foreign('event_id')
      .references('event_id')
      .inTable('Client_Events');

    table
      .foreign('assessment_id')
      .references('assessment_id')
      .inTable('Priority_Assessments');
  });

  // ============================================================
  // INDEXES
  // ============================================================

  await knex.schema.alterTable('Clients', (table) => {
    table.index(['FK_primary_rm_id'], 'IX_Clients_RM');
  });

  await knex.schema.alterTable('Household_Members', (table) => {
    table.index(['client_id'], 'IX_HouseholdMembers_Client');
    table.index(['household_id'], 'IX_HouseholdMembers_Household');
  });

  await knex.schema.alterTable('Client_External_Assets', (table) => {
    table.index(['client_id'], 'IX_Assets_Client');
  });

  await knex.schema.alterTable('Client_Liabilities', (table) => {
    table.index(['client_id'], 'IX_Liabilities_Client');
  });

  await knex.schema.alterTable('Client_Goals', (table) => {
    table.index(['client_id'], 'IX_Goals_Client');
  });

  await knex.schema.alterTable('Portfolios', (table) => {
    table.index(['client_id'], 'IX_Portfolios_Client');
  });

  await knex.schema.alterTable('Portfolio_Holdings', (table) => {
    table.index(['portfolio_id'], 'IX_Holdings_Portfolio');
    table.index(['asset_id'], 'IX_Holdings_Asset');
  });

  await knex.schema.alterTable('Transactions', (table) => {
    table.index(
      ['client_id', 'transaction_date'],
      'IX_Transactions_Client_Date'
    );
  });

  await knex.schema.alterTable('Client_Events', (table) => {
    table.index(
      ['client_id', 'event_date'],
      'IX_Events_Client_Date'
    );

    table.index(['expected_date'], 'IX_Events_Expected_Date');
  });

  await knex.schema.alterTable('Meetings', (table) => {
    table.index(
      ['client_id', 'meeting_date'],
      'IX_Meetings_Client_Date'
    );
  });

  await knex.schema.alterTable('RM_Knowledge', (table) => {
    table.index(
      ['client_id', 'created_at'],
      'IX_Knowledge_Client_Date'
    );
  });

  await knex.schema.alterTable('Client_Tax_Profiles', (table) => {
    table.index(
      ['client_id', 'effective_from'],
      'IX_Tax_Client_Date'
    );
  });

  await knex.schema.alterTable('Priority_Assessments', (table) => {
    table.index(
      ['client_id', 'calculated_at'],
      'IX_Priority_Client_Date'
    );

    table.index(
      ['overall_priority_score'],
      'IX_Priority_Score'
    );
  });

  await knex.schema.alterTable('RM_Actions', (table) => {
    table.index(
      ['rm_id', 'status'],
      'IX_Actions_RM_Status'
    );

    table.index(
      ['due_date'],
      'IX_Actions_DueDate'
    );
  });
};


// ============================================================
// ROLLBACK
// ============================================================

exports.down = async function (knex) {
  /*
   * Drop in reverse dependency order.
   */

  await knex.schema.dropTableIfExists('RM_Actions');

  await knex.schema.dropTableIfExists('Priority_Assessments');

  await knex.schema.dropTableIfExists('KYC_Reviews');

  await knex.schema.dropTableIfExists('Client_Liquidity_Profile');

  await knex.schema.dropTableIfExists('Client_Tax_Profiles');

  await knex.schema.dropTableIfExists('RM_Knowledge');

  await knex.schema.dropTableIfExists('Meetings');

  await knex.schema.dropTableIfExists('Client_Events');

  await knex.schema.dropTableIfExists('Transactions');

  await knex.schema.dropTableIfExists('Portfolio_Holdings');

  await knex.schema.dropTableIfExists('Portfolios');

  await knex.schema.dropTableIfExists('Investment_Assets');

  await knex.schema.dropTableIfExists('Client_Relationships');

  await knex.schema.dropTableIfExists('Persons');

  await knex.schema.dropTableIfExists(
    'Client_Communication_Preferences'
  );

  await knex.schema.dropTableIfExists('Investment_Preferences');

  await knex.schema.dropTableIfExists('Client_Risk_Profile');

  await knex.schema.dropTableIfExists('Client_Goals');

  await knex.schema.dropTableIfExists('Client_Liabilities');

  await knex.schema.dropTableIfExists('Client_External_Assets');

  await knex.schema.dropTableIfExists('Client_Financial_Profile');

  await knex.schema.dropTableIfExists('Household_Members');

  await knex.schema.dropTableIfExists('Households');

  await knex.schema.dropTableIfExists('Clients');

  await knex.schema.dropTableIfExists('Relationship_Managers');
};