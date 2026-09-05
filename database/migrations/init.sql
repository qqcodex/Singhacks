/* ============================================================
   RM_AI_Assistant DATABASE
   Complete Merged Schema
   Target: Microsoft SQL Server / T-SQL

   Includes:
   - 26 Core Wealth Management Tables
   - 5 AI Wealth Intelligence Tables
   - AI Views
   - AI Stored Procedures
   - Indexes
   ============================================================ */


/* ============================================================
   0. CREATE DATABASE
   ============================================================ */

IF DB_ID('RM_AI_Assistant') IS NULL
BEGIN
    CREATE DATABASE RM_AI_Assistant;
END
GO

USE RM_AI_Assistant;
GO


/* ============================================================
   1. RELATIONSHIP MANAGERS
   ============================================================ */

CREATE TABLE Relationship_Managers (
    rm_id INT IDENTITY(1,1) PRIMARY KEY,
    employee_code NVARCHAR(50) NOT NULL UNIQUE,
    first_name NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(100) NOT NULL,
    email NVARCHAR(255) NULL,
    team NVARCHAR(150) NULL,
    region NVARCHAR(100) NULL,
    role NVARCHAR(100) NULL,
    status NVARCHAR(50) DEFAULT 'Active',
    created_at DATETIME2 DEFAULT SYSDATETIME()
);
GO


/* ============================================================
   2. CLIENTS
   ============================================================ */

CREATE TABLE Clients (
    client_id INT IDENTITY(1,1) PRIMARY KEY,
    client_code NVARCHAR(50) NOT NULL UNIQUE,
    first_name NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(100) NOT NULL,
    date_of_birth DATE NULL,
    nationality NVARCHAR(100) NULL,
    client_segment NVARCHAR(50) NULL,
    -- HNWI / Affluent / Family Office / Other

    relationship_status NVARCHAR(50) DEFAULT 'Active',

    FK_primary_rm_id INT NULL,

    created_at DATETIME2 DEFAULT SYSDATETIME(),
    updated_at DATETIME2 DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Client_RM
        FOREIGN KEY (FK_primary_rm_id)
        REFERENCES Relationship_Managers(rm_id)
);
GO


/* ============================================================
   3. HOUSEHOLDS
   ============================================================ */

CREATE TABLE Households (
    household_id INT IDENTITY(1,1) PRIMARY KEY,

    household_name NVARCHAR(200) NOT NULL,
    household_type NVARCHAR(100) NULL,
    -- Family / Individual / Multi-generational / Other

    primary_rm_id INT NULL,
    notes NVARCHAR(MAX) NULL,

    created_at DATETIME2 DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Household_RM
        FOREIGN KEY (primary_rm_id)
        REFERENCES Relationship_Managers(rm_id)
);
GO


/* ============================================================
   4. HOUSEHOLD MEMBERS
   ============================================================ */

CREATE TABLE Household_Members (
    household_member_id INT IDENTITY(1,1) PRIMARY KEY,

    household_id INT NOT NULL,
    client_id INT NOT NULL,

    relationship_to_household NVARCHAR(100) NULL,
    ownership_percentage DECIMAL(8,4) NULL,

    is_primary_member BIT DEFAULT 0,

    joined_date DATE NULL,
    left_date DATE NULL,

    CONSTRAINT FK_HouseholdMember_Household
        FOREIGN KEY (household_id)
        REFERENCES Households(household_id)
        ON DELETE CASCADE,

    CONSTRAINT FK_HouseholdMember_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE,

    CONSTRAINT UQ_Household_Client
        UNIQUE (household_id, client_id)
);
GO


/* ============================================================
   5. CLIENT FINANCIAL PROFILE
   ============================================================ */

CREATE TABLE Client_Financial_Profile (
    financial_profile_id INT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL UNIQUE,

    total_aum DECIMAL(20,2) DEFAULT 0,
    annual_revenue DECIMAL(20,2) DEFAULT 0,
    estimated_net_worth DECIMAL(20,2) NULL,
    liquid_assets DECIMAL(20,2) NULL,
    total_liabilities DECIMAL(20,2) NULL,

    base_currency CHAR(3) DEFAULT 'SGD',

    annual_income DECIMAL(20,2) NULL,

    updated_at DATETIME2 DEFAULT SYSDATETIME(),

    CONSTRAINT FK_FinancialProfile_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE
);
GO


/* ============================================================
   6. EXTERNAL CLIENT ASSETS
   ============================================================ */

CREATE TABLE Client_External_Assets (
    external_asset_id INT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL,

    asset_type NVARCHAR(100) NOT NULL,
    -- Property / Private Business / Private Equity / Art /
    -- Cash / Other

    description NVARCHAR(500) NULL,

    estimated_value DECIMAL(20,2) NOT NULL,

    currency CHAR(3) DEFAULT 'SGD',

    liquidity_level NVARCHAR(50) NULL,
    -- Liquid / Semi-liquid / Illiquid

    ownership_percentage DECIMAL(8,4) NULL,

    acquisition_date DATE NULL,
    cost_basis DECIMAL(20,2) NULL,

    updated_at DATETIME2 DEFAULT SYSDATETIME(),

    CONSTRAINT FK_ExternalAssets_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE
);
GO


/* ============================================================
   7. LIABILITIES
   ============================================================ */

CREATE TABLE Client_Liabilities (
    liability_id INT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL,

    liability_type NVARCHAR(100) NOT NULL,
    -- Mortgage / Business Loan / Credit Facility / Other

    description NVARCHAR(500) NULL,

    outstanding_amount DECIMAL(20,2) NOT NULL,
    original_amount DECIMAL(20,2) NULL,

    interest_rate DECIMAL(8,4) NULL,

    maturity_date DATE NULL,

    currency CHAR(3) DEFAULT 'SGD',

    updated_at DATETIME2 DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Liabilities_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE
);
GO


/* ============================================================
   8. CLIENT GOALS
   ============================================================ */

CREATE TABLE Client_Goals (
    goal_id INT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL,

    goal_type NVARCHAR(100) NOT NULL,
    -- Retirement / Education / Wealth Growth /
    -- Wealth Preservation / Legacy / Succession /
    -- Philanthropy / Liquidity / Property / Business

    title NVARCHAR(200) NOT NULL,
    description NVARCHAR(MAX) NULL,

    target_amount DECIMAL(20,2) NULL,

    currency CHAR(3) DEFAULT 'SGD',

    target_date DATE NULL,

    priority NVARCHAR(50) NULL,
    -- Low / Medium / High / Critical

    status NVARCHAR(50) DEFAULT 'Active',

    created_at DATETIME2 DEFAULT SYSDATETIME(),
    updated_at DATETIME2 DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Goals_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE
);
GO


/* ============================================================
   9. CLIENT RISK PROFILE
   ============================================================ */

CREATE TABLE Client_Risk_Profile (
    risk_profile_id INT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL,

    risk_tolerance NVARCHAR(50) NULL,
    -- Low / Moderate / High

    risk_capacity NVARCHAR(50) NULL,
    -- Low / Moderate / High

    risk_requirement NVARCHAR(50) NULL,
    -- Low / Moderate / High

    investment_experience NVARCHAR(100) NULL,

    investment_horizon_years INT NULL,

    liquidity_requirement NVARCHAR(100) NULL,

    last_assessed_date DATE NULL,
    next_review_date DATE NULL,

    assessment_source NVARCHAR(100) NULL,

    notes NVARCHAR(MAX) NULL,

    CONSTRAINT FK_RiskProfile_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE
);
GO


/* ============================================================
   10. INVESTMENT PREFERENCES
   ============================================================ */

CREATE TABLE Investment_Preferences (
    investment_preference_id INT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL,

    asset_type NVARCHAR(100) NOT NULL,

    preference NVARCHAR(50) NOT NULL,
    -- Preferred / Neutral / Avoid

    preference_strength INT NULL,
    -- 1 - 5

    reason NVARCHAR(MAX) NULL,

    source NVARCHAR(100) NULL,
    -- Client / RM / Questionnaire / AI

    verified BIT DEFAULT 0,

    created_at DATETIME2 DEFAULT SYSDATETIME(),

    CONSTRAINT FK_InvestmentPreference_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE
);
GO


/* ============================================================
   11. COMMUNICATION PREFERENCES
   ============================================================ */

CREATE TABLE Client_Communication_Preferences (
    communication_preference_id INT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL UNIQUE,

    preferred_channel NVARCHAR(100) NULL,
    preferred_time NVARCHAR(100) NULL,
    preferred_frequency NVARCHAR(100) NULL,

    communication_style NVARCHAR(MAX) NULL,
    meeting_preferences NVARCHAR(MAX) NULL,
    important_preferences NVARCHAR(MAX) NULL,

    updated_at DATETIME2 DEFAULT SYSDATETIME(),

    CONSTRAINT FK_CommunicationPreference_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE
);
GO


/* ============================================================
   12. PERSONS
   ============================================================ */

CREATE TABLE Persons (
    person_id INT IDENTITY(1,1) PRIMARY KEY,

    first_name NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(100) NOT NULL,

    date_of_birth DATE NULL,

    occupation NVARCHAR(200) NULL,

    contact_information NVARCHAR(500) NULL,

    created_at DATETIME2 DEFAULT SYSDATETIME()
);
GO


/* ============================================================
   13. CLIENT RELATIONSHIPS
   ============================================================ */

CREATE TABLE Client_Relationships (
    relationship_id INT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL,
    related_person_id INT NOT NULL,

    relationship_type NVARCHAR(100) NOT NULL,
    -- Spouse / Child / Parent / Business Partner /
    -- Advisor / etc.

    relationship_strength NVARCHAR(50) NULL,

    start_date DATE NULL,
    end_date DATE NULL,

    notes NVARCHAR(MAX) NULL,

    CONSTRAINT FK_Relationship_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE,

    CONSTRAINT FK_Relationship_Person
        FOREIGN KEY (related_person_id)
        REFERENCES Persons(person_id)
);
GO


/* ============================================================
   14. INVESTMENT ASSETS
   ============================================================ */

CREATE TABLE Investment_Assets (
    asset_id INT IDENTITY(1,1) PRIMARY KEY,

    asset_name NVARCHAR(200) NOT NULL,

    asset_type NVARCHAR(100) NOT NULL,
    -- Equity / Bond / ETF / Fund / Structured Product / etc.

    ticker NVARCHAR(50) NULL,
    isin NVARCHAR(50) NULL,

    currency CHAR(3) NULL,

    issuer NVARCHAR(200) NULL,

    country NVARCHAR(100) NULL,

    sector NVARCHAR(100) NULL,

    underlying_reference NVARCHAR(200) NULL,

    sub_asset_class NVARCHAR(100) NULL,

    liquidity_tier NVARCHAR(50) NULL,

    concentration_limit_applies BIT NOT NULL DEFAULT 0,

    created_at DATETIME2 DEFAULT SYSDATETIME()
);
GO


/* ============================================================
   15. PORTFOLIOS
   ============================================================ */

CREATE TABLE Portfolios (
    portfolio_id INT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL,

    portfolio_name NVARCHAR(200) NOT NULL,

    portfolio_type NVARCHAR(100) NULL,
    -- Advisory / Discretionary / Execution

    risk_level NVARCHAR(50) NULL,

    total_value DECIMAL(20,2) DEFAULT 0,

    currency CHAR(3) DEFAULT 'SGD',

    created_at DATETIME2 DEFAULT SYSDATETIME(),
    updated_at DATETIME2 DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Portfolio_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE
);
GO


/* ============================================================
   16. MANDATES
   ============================================================ */

CREATE TABLE Mandates (
    mandate_id INT IDENTITY(1,1) PRIMARY KEY,

    portfolio_id INT NOT NULL,

    mandate_code NVARCHAR(50) NOT NULL,

    mandate_name NVARCHAR(200) NULL,

    asset_class NVARCHAR(100) NOT NULL,

    min_pct DECIMAL(8,4) NULL,
    target_pct DECIMAL(8,4) NULL,
    max_pct DECIMAL(8,4) NULL,

    max_single_position_pct DECIMAL(8,4) NULL,

    mandate_notes NVARCHAR(MAX) NULL,

    created_at DATETIME2 DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Mandate_Portfolio
        FOREIGN KEY (portfolio_id)
        REFERENCES Portfolios(portfolio_id)
        ON DELETE CASCADE
);
GO


/* ============================================================
   17. PORTFOLIO HOLDINGS
   ============================================================ */

CREATE TABLE Portfolio_Holdings (
    holding_id BIGINT IDENTITY(1,1) PRIMARY KEY,

    portfolio_id INT NOT NULL,
    asset_id INT NOT NULL,

    snapshot_date DATE NOT NULL,

    quantity DECIMAL(20,8) NULL,

    market_value DECIMAL(20,2) NULL,

    currency CHAR(3) DEFAULT 'SGD',

    allocation_percentage DECIMAL(8,4) NULL,

    cost_basis DECIMAL(20,2) NULL,

    average_purchase_price DECIMAL(20,8) NULL,

    acquisition_date DATE NULL,

    unrealised_gain_loss DECIMAL(20,2) NULL,

    unrealised_gain_loss_percentage DECIMAL(8,4) NULL,

    updated_at DATETIME2 DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Holding_Portfolio
        FOREIGN KEY (portfolio_id)
        REFERENCES Portfolios(portfolio_id)
        ON DELETE CASCADE,

    CONSTRAINT FK_Holding_Asset
        FOREIGN KEY (asset_id)
        REFERENCES Investment_Assets(asset_id),

    CONSTRAINT UQ_Holdings_Portfolio_Asset_Snapshot
        UNIQUE (portfolio_id, asset_id, snapshot_date)
);
GO


/* ============================================================
   18. TRANSACTIONS
   ============================================================ */

CREATE TABLE Transactions (
    transaction_id BIGINT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL,

    portfolio_id INT NULL,
    asset_id INT NULL,

    transaction_type NVARCHAR(100) NOT NULL,
    -- Buy / Sell / Deposit / Withdrawal / Transfer

    quantity DECIMAL(20,8) NULL,

    amount DECIMAL(20,2) NOT NULL,

    currency CHAR(3) DEFAULT 'SGD',

    transaction_date DATETIME2 NOT NULL,

    description NVARCHAR(500) NULL,

    created_at DATETIME2 DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Transaction_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE,

    CONSTRAINT FK_Transaction_Portfolio
        FOREIGN KEY (portfolio_id)
        REFERENCES Portfolios(portfolio_id),

    CONSTRAINT FK_Transaction_Asset
        FOREIGN KEY (asset_id)
        REFERENCES Investment_Assets(asset_id)
);
GO


/* ============================================================
   19. CLIENT EVENTS
   ============================================================ */

CREATE TABLE Client_Events (
    event_id BIGINT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL,

    event_type NVARCHAR(100) NOT NULL,
    -- Business Sale / Inheritance / Retirement /
    -- Property Purchase / Marriage / Relocation /
    -- Liquidity Event / IPO / Education / Other

    title NVARCHAR(200) NOT NULL,

    event_date DATE NULL,
    expected_date DATE NULL,

    description NVARCHAR(MAX) NULL,

    estimated_value DECIMAL(20,2) NULL,

    currency CHAR(3) DEFAULT 'SGD',

    urgency NVARCHAR(50) NULL,

    impact_level NVARCHAR(50) NULL,

    status NVARCHAR(50) DEFAULT 'Open',

    source NVARCHAR(100) NULL,

    created_at DATETIME2 DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Event_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE
);
GO


/* ============================================================
   20. MEETINGS
   ============================================================ */

CREATE TABLE Meetings (
    meeting_id BIGINT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL,

    rm_id INT NULL,

    meeting_date DATETIME2 NOT NULL,

    meeting_type NVARCHAR(100) NULL,
    -- In-person / Video / Phone

    subject NVARCHAR(300) NULL,

    summary NVARCHAR(MAX) NULL,

    follow_up_required BIT DEFAULT 0,

    follow_up_date DATE NULL,

    created_at DATETIME2 DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Meeting_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE,

    CONSTRAINT FK_Meeting_RM
        FOREIGN KEY (rm_id)
        REFERENCES Relationship_Managers(rm_id)
);
GO


/* ============================================================
   21. RM KNOWLEDGE / NOTES
   ============================================================ */

CREATE TABLE RM_Knowledge (
    knowledge_id BIGINT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL,

    rm_id INT NULL,

    knowledge_type NVARCHAR(100) NOT NULL,
    -- Preference / Observation / Client Statement /
    -- Strategy / Family / Business / Behaviour / Other

    title NVARCHAR(300) NOT NULL,

    content NVARCHAR(MAX) NOT NULL,

    source_type NVARCHAR(100) NULL,
    -- Client / RM / Meeting / Email / Document / AI

    confidence_score DECIMAL(5,2) NULL,

    verified BIT DEFAULT 0,

    verified_by_rm_id INT NULL,

    verified_at DATETIME2 NULL,

    importance NVARCHAR(50) NULL,

    expiry_date DATE NULL,

    created_at DATETIME2 DEFAULT SYSDATETIME(),

    updated_at DATETIME2 DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Knowledge_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE,

    CONSTRAINT FK_Knowledge_RM
        FOREIGN KEY (rm_id)
        REFERENCES Relationship_Managers(rm_id),

    CONSTRAINT FK_Knowledge_VerifiedBy
        FOREIGN KEY (verified_by_rm_id)
        REFERENCES Relationship_Managers(rm_id)
);
GO


/* ============================================================
   22. TAX PROFILES
   ============================================================ */

CREATE TABLE Client_Tax_Profiles (
    tax_profile_id BIGINT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL,

    tax_jurisdiction NVARCHAR(100) NOT NULL,

    tax_residency_status NVARCHAR(100) NULL,

    tax_domicile NVARCHAR(100) NULL,

    tax_identification_country NVARCHAR(100) NULL,

    capital_gains_tax_status NVARCHAR(200) NULL,

    estate_tax_status NVARCHAR(200) NULL,

    withholding_tax_status NVARCHAR(200) NULL,

    tax_year INT NULL,

    effective_from DATE NULL,
    effective_to DATE NULL,

    notes NVARCHAR(MAX) NULL,

    source NVARCHAR(100) NULL,

    verified BIT DEFAULT 0,

    created_at DATETIME2 DEFAULT SYSDATETIME(),

    CONSTRAINT FK_TaxProfile_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE
);
GO


/* ============================================================
   23. LIQUIDITY PROFILE
   ============================================================ */

CREATE TABLE Client_Liquidity_Profile (
    liquidity_profile_id INT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL UNIQUE,

    immediate_liquidity DECIMAL(20,2) DEFAULT 0,

    short_term_liquidity DECIMAL(20,2) DEFAULT 0,

    illiquid_assets DECIMAL(20,2) DEFAULT 0,

    expected_cash_needs DECIMAL(20,2) DEFAULT 0,

    minimum_cash_reserve DECIMAL(20,2) DEFAULT 0,

    currency CHAR(3) DEFAULT 'SGD',

    updated_at DATETIME2 DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Liquidity_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE
);
GO


/* ============================================================
   24. KYC / COMPLIANCE REVIEWS
   ============================================================ */

CREATE TABLE KYC_Reviews (
    review_id BIGINT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL,

    reviewed_by_rm_id INT NULL,

    review_date DATE NOT NULL,

    status NVARCHAR(50) NULL,

    next_review_date DATE NULL,

    source_of_wealth NVARCHAR(MAX) NULL,

    source_of_funds NVARCHAR(MAX) NULL,

    tax_residency NVARCHAR(200) NULL,

    regulatory_classification NVARCHAR(100) NULL,

    pep_status BIT DEFAULT 0,

    sanctions_screening_status NVARCHAR(50) NULL,

    suitability_status NVARCHAR(50) NULL,

    documentation_status NVARCHAR(50) NULL,

    notes NVARCHAR(MAX) NULL,

    CONSTRAINT FK_KYC_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE,

    CONSTRAINT FK_KYC_RM
        FOREIGN KEY (reviewed_by_rm_id)
        REFERENCES Relationship_Managers(rm_id)
);
GO


/* ============================================================
   25. PRIORITY ASSESSMENTS
   ============================================================ */

CREATE TABLE Priority_Assessments (
    assessment_id BIGINT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL,

    client_value_score DECIMAL(5,2) NOT NULL,

    attention_need_score DECIMAL(5,2) NOT NULL,

    overall_priority_score DECIMAL(5,2) NOT NULL,

    priority_reason NVARCHAR(MAX) NULL,

    recommended_action NVARCHAR(MAX) NULL,

    model_version NVARCHAR(100) NULL,

    calculated_at DATETIME2 DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Priority_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE
);
GO


/* ============================================================
   26. RM ACTIONS
   ============================================================ */

CREATE TABLE RM_Actions (
    action_id BIGINT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL,

    rm_id INT NULL,

    event_id BIGINT NULL,

    assessment_id BIGINT NULL,

    action_type NVARCHAR(100) NOT NULL,
    -- Contact Client / Portfolio Review /
    -- Schedule Meeting / Follow Up /
    -- Compliance Review / Investment Proposal / Other

    title NVARCHAR(300) NOT NULL,

    description NVARCHAR(MAX) NULL,

    priority NVARCHAR(50) NULL,

    due_date DATE NULL,

    status NVARCHAR(50) DEFAULT 'Open',

    completed_at DATETIME2 NULL,

    created_at DATETIME2 DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Action_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE,

    CONSTRAINT FK_Action_RM
        FOREIGN KEY (rm_id)
        REFERENCES Relationship_Managers(rm_id),

    CONSTRAINT FK_Action_Event
        FOREIGN KEY (event_id)
        REFERENCES Client_Events(event_id),

    CONSTRAINT FK_Action_Assessment
        FOREIGN KEY (assessment_id)
        REFERENCES Priority_Assessments(assessment_id)
);
GO


/* ============================================================
   AI WEALTH INTELLIGENCE
   ============================================================ */


/* ============================================================
   27. AI ANALYSIS SNAPSHOTS
   ============================================================ */

CREATE TABLE ai_analysis_snapshots (
    snapshot_id BIGINT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL,

    generated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    question_asked NVARCHAR(1000) NULL,

    risk_level NVARCHAR(20) NOT NULL,

    headline NVARCHAR(500) NULL,

    confidence_score DECIMAL(5,4) NOT NULL,

    total_aum DECIMAL(20,2) NOT NULL DEFAULT 0,

    aum_currency CHAR(3) NOT NULL DEFAULT 'SGD',

    portfolio_change_pct DECIMAL(8,4) NULL,

    full_report NVARCHAR(MAX) NOT NULL,

    high_risk_count INT DEFAULT 0,

    medium_risk_count INT DEFAULT 0,

    low_risk_count INT DEFAULT 0,

    analysis_version NVARCHAR(50) DEFAULT '1.0',

    created_by NVARCHAR(100) NULL,

    CONSTRAINT FK_Snapshot_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE
);
GO


/* ============================================================
   28. AI ACTIONABLE STEPS
   ============================================================ */

CREATE TABLE ai_actionable_steps (
    step_id BIGINT IDENTITY(1,1) PRIMARY KEY,

    snapshot_id BIGINT NOT NULL,

    client_id INT NOT NULL,

    risk_id NVARCHAR(50) NULL,

    title NVARCHAR(500) NOT NULL,

    action_description NVARCHAR(1000) NOT NULL,

    priority NVARCHAR(20) NOT NULL,

    severity NVARCHAR(20) NOT NULL,

    timeline NVARCHAR(100) NOT NULL,

    responsible_party NVARCHAR(100) NOT NULL,

    status NVARCHAR(50) DEFAULT 'PENDING',

    completed_at DATETIME2 NULL,

    notes NVARCHAR(500) NULL,

    created_at DATETIME2 DEFAULT SYSDATETIME(),

    updated_at DATETIME2 DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Step_Snapshot
        FOREIGN KEY (snapshot_id)
        REFERENCES ai_analysis_snapshots(snapshot_id)
        ON DELETE CASCADE,

    CONSTRAINT FK_Step_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE
);
GO


/* ============================================================
   29. UPLOADED DOCUMENTS
   ============================================================ */

CREATE TABLE uploaded_documents (
    document_id BIGINT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL,

    document_name NVARCHAR(500) NOT NULL,

    document_type NVARCHAR(50) NOT NULL,

    file_path NVARCHAR(1000) NOT NULL,

    file_size_bytes BIGINT NOT NULL,

    processed BIT DEFAULT 0,

    processed_at DATETIME2 NULL,

    ai_summary NVARCHAR(MAX) NULL,

    key_insights NVARCHAR(MAX) NULL,

    extracted_entities NVARCHAR(MAX) NULL,

    document_category NVARCHAR(100) NULL,

    relevance_score DECIMAL(5,2) NULL,

    upload_date DATETIME2 DEFAULT SYSDATETIME(),

    uploaded_by NVARCHAR(100) NULL,

    CONSTRAINT FK_Doc_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE
);
GO


/* ============================================================
   30. DOCUMENT PROCESSING LOGS
   ============================================================ */

CREATE TABLE document_processing_logs (
    log_id BIGINT IDENTITY(1,1) PRIMARY KEY,

    document_id BIGINT NOT NULL,

    processing_stage NVARCHAR(100) NOT NULL,

    status NVARCHAR(50) NOT NULL,

    message NVARCHAR(MAX) NULL,

    error_details NVARCHAR(MAX) NULL,

    created_at DATETIME2 DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Log_Doc
        FOREIGN KEY (document_id)
        REFERENCES uploaded_documents(document_id)
        ON DELETE CASCADE
);
GO


/* ============================================================
   31. AI AUDIT TRAIL
   ============================================================ */

CREATE TABLE ai_audit_trail (
    audit_id BIGINT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL,

    action_type NVARCHAR(50) NOT NULL,

    action_details NVARCHAR(MAX) NULL,

    performed_by NVARCHAR(100) NULL,

    ip_address NVARCHAR(50) NULL,

    user_agent NVARCHAR(500) NULL,

    created_at DATETIME2 DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Audit_Client
        FOREIGN KEY (client_id)
        REFERENCES Clients(client_id)
        ON DELETE CASCADE
);
GO


/* ============================================================
   INDEXES
   ============================================================ */


/* ---- Core Schema Indexes ---- */

CREATE INDEX IX_Clients_RM
    ON Clients(FK_primary_rm_id);

CREATE INDEX IX_HouseholdMembers_Client
    ON Household_Members(client_id);

CREATE INDEX IX_HouseholdMembers_Household
    ON Household_Members(household_id);

CREATE INDEX IX_Assets_Client
    ON Client_External_Assets(client_id);

CREATE INDEX IX_Liabilities_Client
    ON Client_Liabilities(client_id);

CREATE INDEX IX_Goals_Client
    ON Client_Goals(client_id);

CREATE INDEX IX_Portfolios_Client
    ON Portfolios(client_id);

CREATE INDEX IX_Holdings_Portfolio
    ON Portfolio_Holdings(portfolio_id);

CREATE INDEX IX_Holdings_Asset
    ON Portfolio_Holdings(asset_id);

CREATE INDEX IX_Holdings_Snapshot
    ON Portfolio_Holdings(snapshot_date);

CREATE INDEX IX_Holdings_Portfolio_Snapshot
    ON Portfolio_Holdings(portfolio_id, snapshot_date);

CREATE INDEX IX_Transactions_Client_Date
    ON Transactions(client_id, transaction_date);

CREATE INDEX IX_Events_Client_Date
    ON Client_Events(client_id, event_date);

CREATE INDEX IX_Events_Expected_Date
    ON Client_Events(expected_date);

CREATE INDEX IX_Meetings_Client_Date
    ON Meetings(client_id, meeting_date);

CREATE INDEX IX_Knowledge_Client_Date
    ON RM_Knowledge(client_id, created_at);

CREATE INDEX IX_Tax_Client_Date
    ON Client_Tax_Profiles(client_id, effective_from);

CREATE INDEX IX_Priority_Client_Date
    ON Priority_Assessments(client_id, calculated_at);

CREATE INDEX IX_Priority_Score
    ON Priority_Assessments(overall_priority_score DESC);

CREATE INDEX IX_Actions_RM_Status
    ON RM_Actions(rm_id, status);

CREATE INDEX IX_Actions_DueDate
    ON RM_Actions(due_date);

CREATE INDEX IX_Mandates_Portfolio
    ON Mandates(portfolio_id);

CREATE INDEX IX_Assets_UnderlyingReference
    ON Investment_Assets(underlying_reference);


/* ---- AI Schema Indexes ---- */

CREATE INDEX IX_AI_Snapshots_Client
    ON ai_analysis_snapshots(client_id, generated_at DESC);

CREATE INDEX IX_AI_Snapshots_Risk
    ON ai_analysis_snapshots(risk_level, generated_at DESC);

CREATE INDEX IX_AI_Steps_Client
    ON ai_actionable_steps(client_id, status, priority);

CREATE INDEX IX_AI_Steps_Snapshot
    ON ai_actionable_steps(snapshot_id);

CREATE INDEX IX_Documents_Client
    ON uploaded_documents(client_id, upload_date DESC);

CREATE INDEX IX_Documents_Processed
    ON uploaded_documents(processed, client_id);

CREATE INDEX IX_Logs_Document
    ON document_processing_logs(document_id, created_at DESC);

CREATE INDEX IX_Audit_Client
    ON ai_audit_trail(client_id, created_at DESC);
GO


/* ============================================================
   32. VIEW
   Latest AI Insight Per Client
   ============================================================ */

IF OBJECT_ID('vw_client_latest_insights', 'V') IS NOT NULL
    DROP VIEW vw_client_latest_insights;
GO

CREATE VIEW vw_client_latest_insights
AS
SELECT
    s.client_id,

    c.client_code,

    c.first_name + ' ' + c.last_name AS client_name,

    s.snapshot_id,

    s.generated_at,

    s.risk_level,

    s.headline,

    s.total_aum,

    s.aum_currency,

    s.confidence_score,

    COUNT(
        CASE
            WHEN steps.status = 'PENDING'
             AND steps.priority = 'HIGH'
            THEN 1
        END
    ) AS pending_high_priority_actions,

    COUNT(
        CASE
            WHEN steps.status = 'PENDING'
            THEN 1
        END
    ) AS total_pending_actions,

    ROW_NUMBER() OVER (
        PARTITION BY s.client_id
        ORDER BY s.generated_at DESC
    ) AS rn

FROM ai_analysis_snapshots s

INNER JOIN Clients c
    ON c.client_id = s.client_id

LEFT JOIN ai_actionable_steps steps
    ON steps.snapshot_id = s.snapshot_id

GROUP BY
    s.client_id,
    c.client_code,
    c.first_name,
    c.last_name,
    s.snapshot_id,
    s.generated_at,
    s.risk_level,
    s.headline,
    s.total_aum,
    s.aum_currency,
    s.confidence_score;
GO


/* ============================================================
   33. VIEW
   Current AI Insight Per Client
   ============================================================ */

IF OBJECT_ID('vw_client_current_insight', 'V') IS NOT NULL
    DROP VIEW vw_client_current_insight;
GO

CREATE VIEW vw_client_current_insight
AS
SELECT
    client_id,
    client_code,
    client_name,
    snapshot_id,
    generated_at,
    risk_level,
    headline,
    total_aum,
    aum_currency,
    confidence_score,
    pending_high_priority_actions,
    total_pending_actions
FROM vw_client_latest_insights
WHERE rn = 1;
GO


/* ============================================================
   34. STORED PROCEDURE
   Get Client Analysis History
   ============================================================ */

IF OBJECT_ID('sp_GetClientAnalysisHistory', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetClientAnalysisHistory;
GO

CREATE PROCEDURE sp_GetClientAnalysisHistory
    @client_id INT,
    @limit INT = 10
AS
BEGIN

    SET NOCOUNT ON;

    SELECT TOP (@limit)

        snapshot_id,

        generated_at,

        question_asked,

        risk_level,

        headline,

        total_aum,

        aum_currency,

        confidence_score,

        high_risk_count,

        medium_risk_count,

        low_risk_count,

        portfolio_change_pct,

        full_report,

        analysis_version,

        created_by

    FROM ai_analysis_snapshots

    WHERE client_id = @client_id

    ORDER BY generated_at DESC;

END
GO


/* ============================================================
   35. STORED PROCEDURE
   Get Pending Actions
   ============================================================ */

IF OBJECT_ID('sp_GetPendingActions', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetPendingActions;
GO

CREATE PROCEDURE sp_GetPendingActions
    @client_id INT = NULL
AS
BEGIN

    SET NOCOUNT ON;

    SELECT

        s.client_id,

        c.client_code,

        c.first_name + ' ' + c.last_name AS client_name,

        s.generated_at AS analysis_date,

        steps.step_id,

        steps.snapshot_id,

        steps.risk_id,

        steps.title,

        steps.action_description,

        steps.priority,

        steps.severity,

        steps.timeline,

        steps.responsible_party,

        steps.status,

        steps.notes,

        steps.created_at,

        DATEDIFF(
            DAY,
            steps.created_at,
            GETDATE()
        ) AS days_open

    FROM ai_actionable_steps steps

    INNER JOIN ai_analysis_snapshots s
        ON s.snapshot_id = steps.snapshot_id

    INNER JOIN Clients c
        ON c.client_id = steps.client_id

    WHERE steps.status = 'PENDING'

        AND (
            @client_id IS NULL
            OR steps.client_id = @client_id
        )

    ORDER BY

        CASE steps.priority

            WHEN 'CRITICAL' THEN 1
            WHEN 'HIGH' THEN 2
            WHEN 'MEDIUM' THEN 3
            WHEN 'LOW' THEN 4

            ELSE 5

        END,

        steps.created_at ASC;

END
GO


/* ============================================================
   36. STORED PROCEDURE
   Update AI Action Status
   ============================================================ */

IF OBJECT_ID('sp_UpdateActionStatus', 'P') IS NOT NULL
    DROP PROCEDURE sp_UpdateActionStatus;
GO

CREATE PROCEDURE sp_UpdateActionStatus

    @step_id BIGINT,

    @status NVARCHAR(50),

    @notes NVARCHAR(500) = NULL,

    @performed_by NVARCHAR(100) = NULL

AS
BEGIN

    SET NOCOUNT ON;

    DECLARE @client_id INT;

    /* --------------------------------------------
       Get Client ID Before Updating
       -------------------------------------------- */

    SELECT
        @client_id = client_id
    FROM ai_actionable_steps
    WHERE step_id = @step_id;


    /* --------------------------------------------
       Validate Step
       -------------------------------------------- */

    IF @client_id IS NULL
    BEGIN

        RAISERROR(
            'Action step does not exist.',
            16,
            1
        );

        RETURN;

    END;


    /* --------------------------------------------
       Update Action
       -------------------------------------------- */

    UPDATE ai_actionable_steps

    SET

        status = @status,

        notes = @notes,

        completed_at =
            CASE
                WHEN @status = 'COMPLETED'
                    THEN SYSDATETIME()

                WHEN @status <> 'COMPLETED'
                    THEN NULL

                ELSE completed_at
            END,

        updated_at = SYSDATETIME()

    WHERE step_id = @step_id;


    /* --------------------------------------------
       Audit Trail
       -------------------------------------------- */

    INSERT INTO ai_audit_trail
    (
        client_id,
        action_type,
        action_details,
        performed_by
    )

    VALUES
    (
        @client_id,

        'ACTION_UPDATED',

        CONCAT(
            'Step ',
            CAST(@step_id AS NVARCHAR(20)),
            ' status changed to ',
            @status,

            CASE
                WHEN @notes IS NOT NULL
                    THEN CONCAT(
                        '. Notes: ',
                        @notes
                    )
                ELSE ''
            END
        ),

        @performed_by
    );

END
GO


/* ============================================================
   37. VERIFICATION
   ============================================================ */

PRINT '';
PRINT '============================================================';
PRINT ' RM_AI_Assistant DATABASE CREATED SUCCESSFULLY';
PRINT '============================================================';
PRINT ' Core tables:        26';
PRINT ' AI tables:           5';
PRINT ' AI views:             2';
PRINT ' AI procedures:        3';
PRINT '============================================================';
PRINT ' Total tables:        31';
PRINT '============================================================';
GO


/* ============================================================
   OPTIONAL VERIFICATION QUERIES
   ============================================================ */


SELECT
    TABLE_SCHEMA,
    TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;


-- Check views

SELECT
    TABLE_SCHEMA,
    TABLE_NAME
FROM INFORMATION_SCHEMA.VIEWS
ORDER BY TABLE_NAME;


-- Check stored procedures

SELECT
    SCHEMA_NAME(schema_id) AS schema_name,
    name
FROM sys.procedures
ORDER BY name;


-- Check clients

SELECT *
FROM Clients;


-- Check current AI insights

SELECT *
FROM vw_client_current_insight;


-- Check pending AI actions

EXEC sp_GetPendingActions;


-- Get analysis history for client ID 1

EXEC sp_GetClientAnalysisHistory
    @client_id = 1,
    @limit = 10;


-- Update an AI action

EXEC sp_UpdateActionStatus
    @step_id = 1,
    @status = 'COMPLETED',
    @notes = 'RM contacted client successfully.',
    @performed_by = 'RM001';
