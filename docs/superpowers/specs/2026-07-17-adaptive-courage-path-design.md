# 自適應挑戰路徑設計

## 目標

移除使用者可選擇的三種訓練契約。新使用者首次登入後先確認挑戰誓約，再提供目標與每週可投入時間，並直接接受較難的校準任務「挑戰的勇氣」。無論成果完整、部分完成或失敗，使用者都能進入正式訓練；系統根據成果與時間，自動挑選目前可承受範圍內最難、但仍有機會完成的下一項任務。

## 首次使用流程

1. Email magic-link 登入成功。
2. 若 `challenge_accepted_at` 尚未設定，顯示不可略過的全畫面誓約彈窗。
3. 「接受挑戰」會記錄接受時間並進入精簡 onboarding；「暫不開始」會登出，不建立訓練進度。
4. Onboarding 只收集顯示名稱、目標、每週可投入分鐘數與時區，不再呈現難度或訓練契約。
5. 完成 onboarding 後只建立「挑戰的勇氣」assignment，並導向任務詳情。
6. 任務可完整或部分提交；提交永遠保存並產生校準回饋，不以失敗阻止進入 Dashboard。

## 誓約彈窗

標題為「挑戰者警告」，主要文案為：

> 這是一條成為強者的道路。  
> 一旦開始，系統將以你的真實成果衡量能力，並持續把你推向目前能承受的最高難度。  
> 失敗不會終止訓練，但逃避不會帶來成長。  
> 你確定要接受第一項挑戰嗎？

主要按鈕為「接受挑戰」，次要按鈕為「暫不開始」。文案中的「沒有回頭路」只代表產品世界觀；使用者仍保有登出、停用與刪除帳號的正常權利。

## 第一關：挑戰的勇氣

這是一項 difficulty 4、預估 90 分鐘的校準任務。使用者取得一份小型表格資料，需盡可能完成：

- 找出至少一項資料品質問題。
- 建立可重現的 baseline 模型或 notebook。
- 說明 validation 方法並回報一個指標。
- 提交 GitHub commit 或 Kaggle notebook。
- 撰寫至少 80 字的反思，說明完成、未完成與下一步。

任務標記為 `purpose = calibration`。證據不足時仍保存 submission，verification status 可為 `needs_revision`，XP 可為 0，但會依可觀察成果建立初始能力值。

校準主要影響 Data Handling、Modeling、Evaluation、Engineering、Communication。Research Sense 與 Product Thinking 先維持基準 20，直到後續任務提供足夠證據。

## 自動選題規則

MVP 使用確定性 selector，不依賴 AI agent：

1. 每日時間預算為 `weekly_minutes / 5`，最低 30 分鐘、最高 180 分鐘。
2. 依七項能力的加權分數計算難度上限：低於 30 選到 2；30–44 選到 3；45–64 選到 4；65 以上選到 5。
3. 候選任務必須未在當日指派、預估時間不超過每日預算，且難度不超過上限。
4. 先選難度最高者；同難度時優先補強最低能力；仍相同時選預估時間較接近預算者。
5. 若沒有符合項目，選最接近時間預算的較低難度任務；不可因候選不足而讓 Dashboard 沒有主線任務。
6. 部分完成或連續 `needs_revision` 會降低下一題的粒度，但不降低長期挑戰上限；高品質完成則允許下一級難度。

## 資料模型

- `profiles` 新增 `challenge_accepted_at timestamptz null`。
- 從新的應用程式 domain profile 與 onboarding input 移除 `contract`。
- `quests` 保留 `difficulty`，新增 `purpose`，值為 `calibration` 或 `training`。
- 新 migration 移除 `profiles.contract` 與 `quests.training_contract`；既有 quest 依其 difficulty 保留，不刪資料。
- Assignment、submission、feedback、XP 與 portfolio 關係維持不變。

## 介面調整

- Onboarding 移除三張訓練契約卡，保留目標、時間與時區。
- Profile 移除訓練契約選單，顯示「自適應難度：啟用」與目前推定難度上限。
- Dashboard 移除契約名稱，改顯示「目前挑戰上限」與「今日時間預算」。
- Quest 與 Resource 仍可顯示 1–5 難度，因為被移除的是使用者選擇，不是任務難度資料。
- Training archive 記錄第一關的部分完成、校準結果與後續調整。

## 錯誤與邊界處理

- 接受誓約寫入失敗時留在彈窗並顯示可重試錯誤，不進入 onboarding。
- 使用者取消誓約時只登出，不刪除帳號。
- 第一關重複建立使用唯一鍵避免重複 assignment。
- 部分提交不得丟失；評分錯誤時保留 submission 為 pending，稍後可重試評估。
- 舊使用者 migration 後視為已接受挑戰，避免再次阻擋既有帳號；只有尚未完成 onboarding 的新帳號需要誓約。

## 驗收標準

- 新使用者無法看見或選擇三種訓練契約。
- 首次登入必定先看到誓約；取消會登出，接受後不再重複出現。
- 完成 onboarding 後只收到「挑戰的勇氣」。
- 完整、部分與低品質提交都能保存並進入 Dashboard。
- 下一項任務符合能力上限與時間預算，且在相同條件下結果可重現。
- 舊帳號可正常進入既有 Dashboard。

