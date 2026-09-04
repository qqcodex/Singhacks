CREATE DATABASE RM_AI_Assistant;
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
   Allows the RM to reason about wealth at family/household level
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
   Many-to-many relationship between clients and households
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
   Current snapshot of high-level financial position
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
   Assets outside managed portfolios
   ============================================================ */

CREATE TABLE Client_External_Assets (
    external_asset_id INT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL,

    asset_type NVARCHAR(100) NOT NULL,
    -- Property
    -- Private Business
    -- Private Equity
    -- Art
    -- Cash
    -- Other

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
    -- Retirement
    -- Education
    -- Wealth Growth
    -- Wealth Preservation
    -- Legacy
    -- Succession
    -- Philanthropy
    -- Liquidity
    -- Property
    -- Business

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
   9. RISK PROFILE
   Separates tolerance, capacity and requirement
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
   Structured preferences
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
   Represents people who may or may not be clients
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
    -- Spouse / Child / Parent / Business Partner / Advisor / etc.

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
   Canonical asset/security table
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
   16. PORTFOLIO HOLDINGS
   ============================================================ */

CREATE TABLE Portfolio_Holdings (
    holding_id BIGINT IDENTITY(1,1) PRIMARY KEY,

    portfolio_id INT NOT NULL,

    asset_id INT NOT NULL,

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
        REFERENCES Investment_Assets(asset_id)
);
GO


/* ============================================================
   17. TRANSACTIONS
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
   18. CLIENT EVENTS
   ============================================================ */

CREATE TABLE Client_Events (
    event_id BIGINT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL,

    event_type NVARCHAR(100) NOT NULL,
    -- Business Sale
    -- Inheritance
    -- Retirement
    -- Property Purchase
    -- Marriage
    -- Relocation
    -- Liquidity Event
    -- IPO
    -- Education
    -- Other

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
   19. MEETINGS
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
   20. RM KNOWLEDGE / NOTES
   Qualitative relationship intelligence
   ============================================================ */

CREATE TABLE RM_Knowledge (
    knowledge_id BIGINT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL,

    rm_id INT NULL,

    knowledge_type NVARCHAR(100) NOT NULL,
    -- Preference
    -- Observation
    -- Client Statement
    -- Strategy
    -- Family
    -- Business
    -- Behaviour
    -- Other

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
   21. TAX PROFILES
   Historical tax information
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
   22. LIQUIDITY PROFILE
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
   23. KYC / COMPLIANCE REVIEWS
   Historical compliance records
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
   24. PRIORITY ASSESSMENTS
   Historical AI / analytics output
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
   25. RM ACTIONS
   What the RM should actually do
   ============================================================ */

CREATE TABLE RM_Actions (
    action_id BIGINT IDENTITY(1,1) PRIMARY KEY,

    client_id INT NOT NULL,

    rm_id INT NULL,

    event_id BIGINT NULL,

    assessment_id BIGINT NULL,

    action_type NVARCHAR(100) NOT NULL,
    -- Contact Client
    -- Portfolio Review
    -- Schedule Meeting
    -- Follow Up
    -- Compliance Review
    -- Investment Proposal
    -- Other

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
   INDEXES
   ============================================================ */

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
GO

