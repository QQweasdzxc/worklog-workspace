# P6 — Personal Work Model Evolution

Status: Architecture / Product Design only  
Coding: Not started  
Schema change: None in this design gate

## Product North Star

> Personal Work Model 的目標，不是讓工作越來越多，而是讓工作模型越來越精準。

P5 lets Mr. KM remember user-confirmed work. P6 lets Mr. KM understand the structure, relationships and evolution of that work.

P6 is not a Merge feature. `Work Model Consolidation` is one capability inside a broader product layer:

> **Personal Work Model Evolution**

The user-facing name remains **我的工作**. `Personal Work Model` is an architecture term and should not become jargon that users must learn.

## 1. Position in Zhuge AI OS

```text
Knowledge / WorkLog / Conversation / future Calendar and Gmail
                            ↓
                     Work Evidence
                            ↓
                    Work Intelligence
                            ↓
                   Work Observations
                            ↓
              Compare Personal Work Model
                            ↓
                Model Revision Proposals
                            ↓
                    User Review Gate
                            ↓
                 Personal Work Model
                            ↓
       WorkLog / KM Suggestions / future Agents
```

### Architecture decision

P5.6 `user_work_models` remains the single formal source for confirmed canonical work. P6 must not create a second official work list.

Future Observation, Proposal, Relationship and Revision History records are supporting memory. They cannot be consumed as formal work until the user confirms a revision.

## 2. Product objects

### Work Evidence

Traceable material Mr. KM learned from:

- SOP / PDF / Excel / other Knowledge sources
- WorkLog history
- Conversation corrections
- Future Calendar / Gmail signals

Evidence explains a model decision. It is not a formal work model.

### Work Observation

An unconfirmed understanding extracted from evidence, for example:

- 發票請款
- 驗收請款
- 應付款管理

Observations may be noisy, duplicated or too granular. They never enter downstream recommendations directly.

### Canonical Work

A user-confirmed formal work identity, for example:

```text
費用請款
```

Canonical Work is what WorkLog suggestions and future Agents reference.

### Included Work

A confirmed capability, variation or sub-work contained by a Canonical Work:

```text
費用請款
├─ 發票請款
├─ 驗收請款
└─ 應付款管理
```

Included Work is not deleted or merely disabled. It remains traceable, searchable and reversible, and can help Mr. KM recognize the user's natural language.

### Model Revision Proposal

Mr. KM's unconfirmed proposal to:

- attach a new observation to an existing Canonical Work;
- create a new Canonical Work;
- consolidate several works;
- split an over-broad work;
- rename a work;
- establish or correct a relationship.

### Model Revision

An accepted, adjusted or rejected proposal. Revision history preserves what changed, why it changed, who confirmed it and how to reverse it.

## 3. Relationship rules

P6 should distinguish relationships instead of treating every similarity as Merge.

| Relationship | Meaning | Example |
|---|---|---|
| `alias_of` | Same work, different wording | 採購案件處理 → 採購案件管理 |
| `included_in` | Sub-work or capability inside a broader work | 發票請款 → 費用請款 |
| `related_to` | Related but independently meaningful | 供應商評鑑 ↔ 供應商管理 |
| `separate_from` | User explicitly says they must remain separate | 年度綠色採購 ≠ 一般採購案件 |
| `supersedes` | A confirmed model revision replaces an older canonical structure | 新版 Canonical Work → 舊版 model revision |

### Consolidation evidence

Mr. KM should compare more than names and keywords:

- purpose;
- output / deliverable;
- workflow and Work DNA;
- system and involved department;
- frequency and trigger;
- historical WorkLog usage;
- whether the user records them together or separately;
- previous accept / adjust / keep-separate feedback.

### Hard blockers

Do not consolidate automatically when:

- outputs are materially different;
- compliance or responsibility differs;
- recurring cadence makes the work independently meaningful;
- ECP classification must remain distinct;
- the user previously selected `保持分開`;
- evidence only shares department or keywords.

`年度綠色採購` must not become `採購案件處理` merely because both contain 採購. Mr. KM may propose `included_in`, `related_to` or `separate_from`, and the user decides.

## 4. Work Model Review flow

```text
New evidence arrives
        ↓
Create Work Observations
        ↓
Compare confirmed Canonical Work
        ↓
Choose a proposed outcome
  ├─ enrich existing Work DNA
  ├─ attach as Included Work
  ├─ propose a new Canonical Work
  ├─ propose consolidation / split / rename
  └─ no valuable model change
        ↓
Accumulate until the proposal is useful
        ↓
Personal Work Model Review
        ↓
Accept / Adjust / Keep separate / Later
        ↓
Create a versioned Model Revision
        ↓
Update the formal Personal Work Model atomically
        ↓
WorkLog and KM Suggestions read the new version
```

### Prompt timing

Mr. KM should not interrupt after every observation. Show Review only when:

- multiple consistent observations support a change;
- a high-confidence duplicate can reduce confusion;
- the change will materially improve WorkLog suggestions;
- the user explicitly opens model review;
- a weekly or periodic review has real proposals.

No useful proposal means no notification.

## 5. User Review rules

AI always proposes. The user always decides.

Before confirmation, show:

- current model;
- proposed model;
- included work and retained evidence;
- why Mr. KM made the proposal;
- what WorkLog / KM Suggestions will reference afterward;
- assurance that historical WorkLog is not rewritten.

Available decisions:

- `接受建議`
- `調整後接受`
- `保持分開`
- `稍後再看`

`保持分開` is learning feedback. Mr. KM should not repeatedly offer the same consolidation unless materially new evidence appears.

Every accepted revision must be reversible.

## 6. UI wireframes

### A. 我的工作

```text
🪶 我的工作

我目前理解你主要有 7 類工作。
這些工作會成為工時建議的正式來源。

┌──────────────────────────────┐
│ 採購案件處理                  │
│                              │
│ 包含：                       │
│ • 採購分析                   │
│ • 採購進度追蹤               │
│ • 合約整理                   │
│                              │
│ 最近使用：7/14               │
│ [查看理解] [編輯]            │
└──────────────────────────────┘

🪶 我有 2 項工作模型整理建議
[查看建議]
```

The first layer shows confirmed work only. Raw observations and engineering metadata remain in the second layer.

### B. Personal Work Model Review

```text
🪶 我重新整理了一下你的工作模型。

我發現這三項工作目的與流程很接近：

• 發票請款
• 驗收請款
• 應付款管理

我建議整理為：

費用請款

包含：
✓ 發票請款
✓ 驗收請款
✓ 應付款管理

為什麼這樣建議？
它們有相近的工作目的、輸出成果與工時紀錄方式。

採用後：
• KM 建議會引用「費用請款」
• 舊名稱仍可被辨識
• 歷史工時不會被修改

[接受建議]
[調整後接受]
[保持分開]
[稍後再看]
```

### C. Mobile Review

```text
🪶 工作模型整理建議

目前
發票請款
驗收請款
應付款管理

        ↓

建議
費用請款
包含 3 項工作

[查看原因]

[接受建議]
[調整]
[保持分開]
```

Mobile shows one proposal at a time. It must not hide affected work, consequences or user controls.

### D. Revision complete

```text
🪶 我已依照你的確認更新工作模型。

之後我會使用：
「費用請款」

來協助你建立相關工時。

原本的工作名稱與來源仍然保留。
```

## 7. Downstream consumption

### WorkLog / KM Suggestions

- Display and save the Canonical Work identity.
- Match user wording against Canonical name, aliases and Included Work.
- Explain recommendations using model relationships and current context.
- Never recommend directly from an unconfirmed Observation or Proposal.

### Historical WorkLog

- Existing entry title and snapshot remain unchanged.
- Future model revisions may map history for analytics, but must not rewrite old entries.

### Future Calendar / Gmail / Agents

- Read the same confirmed Personal Work Model through a shared service boundary.
- Channel or Agent must not create its own work taxonomy.

## 8. Cloud and versioning guardrails

- `user_uuid` remains the ownership boundary.
- `user_work_models` remains the confirmed model source of truth.
- Proposal queues and revision history are separate supporting records.
- Cloud acceptance must be atomic: either the whole revision succeeds or the formal model remains unchanged.
- LocalStorage may cache proposals but cannot confirm a model revision.
- RLS must isolate all future model-support records by `user_uuid`.
- Revision history must support audit and rollback.
- No future Agent may bypass the user confirmation gate.

Exact tables and fields are intentionally not decided in this Product Design gate.

## 9. P6 delivery gates

### P6.0 — Architecture and Product Design

- Product objects and boundaries
- Relationship rules
- Review flow
- Desktop / Mobile wireframes
- Trust, traceability and rollback rules

### P6.1 — Model Revision Foundation

- Cloud proposal / relationship / revision design
- Versioned confirmation flow
- No automatic consolidation

### P6.2 — Personal Work Model Review

- Review Workspace
- Accept / Adjust / Keep separate / Later
- Atomic model update and rollback

### P6.3 — Model Consumption

- WorkLog and KM Suggestions read Canonical Work
- Included Work and aliases improve matching
- Future Agent service boundary

### P6.4 — Continuous Work DNA Learning

- WorkLog, documents and corrections improve Work DNA
- Proposal quality improves over time
- Still requires confirmation for structural model changes

## 10. Acceptance and success metrics

P6 is successful when:

1. Users understand the difference between confirmed work and Mr. KM proposals.
2. The model becomes clearer without losing meaningful distinctions.
3. Every structural change is explainable, traceable and reversible.
4. Rejected relationships are remembered and not repeatedly proposed.
5. All entrances see the same confirmed model and pending reviews.
6. KM suggestion acceptance improves after a confirmed model revision.
7. Time required to complete WorkLog decreases.

Do not use "fewer works" as the only success metric. A smaller but inaccurate model is a regression.

## Final P6 principle

> P5 解決的是「AI 如何記住我的工作」。
>
> P6 解決的是「AI 如何真正理解、整理並演化我的工作」。

Mr. KM should not keep adding cards. He should help each confirmed card become more accurate, complete and useful—without taking the final decision away from the user.
