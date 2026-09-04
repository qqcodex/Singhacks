                                      ┌─────────────────────┐
                                      │ RelationshipManagers│
                                      └─────────┬───────────┘
                                                │
                                                │
                                      ┌─────────▼─────────┐
                                      │      Clients      │
                                      ├───────────────────┤
                                      │ PK client_id      │
                                      │ FK primary_rm_id  │
                                      └─────────┬─────────┘
                                                │
             ┌──────────────────────────────────┼───────────────────────────────────┐
             │                  │               │                │                  │
             ▼                  ▼               ▼                ▼                  ▼
       ┌──────────┐      ┌─────────────┐  ┌───────────┐   ┌───────────┐    ┌────────────┐
       │Households│      │Financial    │  │  Goals    │   │Preferences│    │Tax Profiles│
       └────┬─────┘      │Profile      │  └───────────┘   └───────────┘    └────────────┘
            │            └─────────────┘
            │
            ▼
     Household_Members


 Clients
    │
    ├───────────────┬────────────────┬─────────────────┐
    ▼               ▼                ▼                 ▼
 External       Liabilities      Portfolios         Events
 Assets                              │
                                     ▼
                                  Holdings
                                     │
                                     ▼
                                   Assets
                                     │
                                     ▼
                                Transactions


 Clients
    │
    ├────────── Meetings
    │
    ├────────── RM Notes
    │              │
    │              └── Knowledge metadata
    │
    ├────────── Relationships
    │
    ├────────── Compliance Reviews
    │
    └────────── Priority Assessments