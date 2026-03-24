/**
 * profileFieldPresets.ts — プロフィール項目プリセットカタログ
 *
 * ホストがロビーでワンタップで選択できるプロフィール項目セット。
 * 「設定が面倒」なユーザー向けに、シーン別の項目を事前に用意する。
 *
 * 拡張ポイント:
 * - 新しいプリセット追加 → 配列に追加 + ProfileFieldPresetId 型に追加
 * - 将来的に DB/API から動的取得する場合は PresetRepository Port を定義
 */

import type { ProfileFieldPreset, ProfileFieldPresetId } from "./types/profile.js";
import { DEFAULT_PROFILE_FIELDS } from "./constants.js";

// ============================================================
// プリセットカタログ
// ============================================================

/**
 * 全プリセットの静的カタログ。
 * 先頭の "default" が初期選択として扱われる。
 */
export const PROFILE_FIELD_PRESETS: readonly ProfileFieldPreset[] = [
    // -------------------------------------------------------
    // 1. デフォルト（既存の DEFAULT_PROFILE_FIELDS を流用）
    // -------------------------------------------------------
    {
        id: "default",
        label: "基本の自己紹介",
        icon: "🎯",
        description: "初めてでも使いやすいスタンダードな項目セット",
        fields: DEFAULT_PROFILE_FIELDS,
    },

    // -------------------------------------------------------
    // 2. 飲み会・懇親会
    // -------------------------------------------------------
    {
        id: "drinking_party",
        label: "飲み会・懇親会",
        icon: "🍻",
        description: "お酒の場で盛り上がる話題",
        fields: [
            { id: "drink_preference", label: "お酒の好み", placeholder: "例: ビール、ハイボール、飲めません" },
            { id: "favorite_bar", label: "おすすめのお店", placeholder: "例: 渋谷の〇〇" },
            { id: "drunk_behavior", label: "酔うとどうなる？", placeholder: "例: よく喋る、すぐ寝る" },
            { id: "current_boom", label: "最近のマイブーム", placeholder: "例: クラフトビール巡り" },
            { id: "closing_ramen", label: "締めのラーメン派？", placeholder: "例: 味噌ラーメン一択！" },
            { id: "drinking_episode", label: "飲み会エピソード", placeholder: "例: 新人歓迎会で..." },
        ],
    },

    // -------------------------------------------------------
    // 3. はじめまして
    // -------------------------------------------------------
    {
        id: "first_meeting",
        label: "はじめまして",
        icon: "🤝",
        description: "初対面で知りたい基本情報",
        fields: [
            { id: "name_origin", label: "名前の由来", placeholder: "例: 春に生まれたから" },
            { id: "hometown", label: "出身地", placeholder: "例: 北海道札幌市" },
            { id: "self_in_a_word", label: "ひとことで自分を表すと", placeholder: "例: 好奇心旺盛な人" },
            { id: "holiday_style", label: "休日の過ごし方", placeholder: "例: カフェ巡り" },
            { id: "current_hobby", label: "最近ハマっていること", placeholder: "例: ヨガ" },
            { id: "greeting", label: "よろしくの一言", placeholder: "例: 気軽に話しかけてください！" },
        ],
    },

    // -------------------------------------------------------
    // 4. もっと深く知りたい
    // -------------------------------------------------------
    {
        id: "deep_dive",
        label: "もっと深く知りたい",
        icon: "🔍",
        description: "価値観や人生観にフォーカス",
        fields: [
            { id: "turning_point", label: "人生のターニングポイント", placeholder: "例: 大学で留学したこと" },
            { id: "core_value", label: "大切にしている価値観", placeholder: "例: 誠実さ" },
            { id: "ten_years_later", label: "10年後の自分", placeholder: "例: 海外で暮らしていたい" },
            { id: "influential_person", label: "影響を受けた人物", placeholder: "例: 祖母" },
            { id: "morning_first", label: "朝起きて一番にすること", placeholder: "例: コーヒーを淹れる" },
            { id: "self_manual", label: "自分の取扱説明書", placeholder: "例: 褒められると伸びるタイプ" },
        ],
    },

    // -------------------------------------------------------
    // 5. 将来の目標・夢
    // -------------------------------------------------------
    {
        id: "future_goals",
        label: "将来の目標・夢",
        icon: "🚀",
        description: "未来志向のポジティブな話題",
        fields: [
            { id: "this_year_goal", label: "今年中にやりたいこと", placeholder: "例: フルマラソン完走" },
            { id: "five_years_ideal", label: "5年後の理想", placeholder: "例: 自分のお店を持つ" },
            { id: "new_skill", label: "挑戦したいスキル", placeholder: "例: プログラミング" },
            { id: "dream_destination", label: "行ってみたい国", placeholder: "例: アイスランド" },
            { id: "big_dream", label: "叶えたい夢", placeholder: "例: 本を出版する" },
            { id: "small_goal", label: "来月の小さな目標", placeholder: "例: 毎朝6時起き" },
        ],
    },

    // -------------------------------------------------------
    // 6. 思い出・過去の話
    // -------------------------------------------------------
    {
        id: "past_stories",
        label: "思い出・過去の話",
        icon: "📖",
        description: "懐かしいエピソードで盛り上がる",
        fields: [
            { id: "childhood_dream", label: "子どもの頃の夢", placeholder: "例: 宇宙飛行士" },
            { id: "school_club", label: "学生時代の部活", placeholder: "例: 吹奏楽部でトランペット" },
            { id: "funniest_moment", label: "人生で一番笑った出来事", placeholder: "例: 友達と..." },
            { id: "first_job", label: "初めてのアルバイト", placeholder: "例: コンビニ店員" },
            { id: "best_trip_memory", label: "忘れられない旅の思い出", placeholder: "例: 沖縄でダイビング" },
            { id: "old_obsession", label: "昔ハマっていたもの", placeholder: "例: ポケモンカード" },
        ],
    },

    // -------------------------------------------------------
    // 7. 会社・仕事
    // -------------------------------------------------------
    {
        id: "company_work",
        label: "会社・仕事",
        icon: "💼",
        description: "職場の仲間をもっと知る",
        fields: [
            { id: "join_reason", label: "入社・転職のきっかけ", placeholder: "例: 面白そうな事業だったから" },
            { id: "job_role", label: "担当している仕事", placeholder: "例: フロントエンド開発" },
            { id: "work_joy", label: "仕事のやりがい", placeholder: "例: ユーザーの反応が見えるとき" },
            { id: "work_habit", label: "仕事中の癖", placeholder: "例: 考え中にペンを回す" },
            { id: "lunch_spot", label: "おすすめのランチスポット", placeholder: "例: オフィス近くの〇〇" },
            { id: "work_fail", label: "仕事の失敗談", placeholder: "例: 本番環境で..." },
        ],
    },

    // -------------------------------------------------------
    // 8. ベストバイ・推しアイテム
    // -------------------------------------------------------
    {
        id: "best_buys",
        label: "ベストバイ・推しアイテム",
        icon: "🛒",
        description: "買ってよかったもの・推しグッズの話",
        fields: [
            { id: "best_buy_this_year", label: "今年のベストバイ", placeholder: "例: ワイヤレスイヤホン" },
            { id: "best_buy_last_year", label: "去年のベストバイ", placeholder: "例: 電動歯ブラシ" },
            { id: "daily_essential", label: "毎日使う愛用品", placeholder: "例: お気に入りのマグカップ" },
            { id: "recommend_item", label: "人におすすめしたいもの", placeholder: "例: Kindle Paperwhite" },
            { id: "regret_buy", label: "買って後悔したもの", placeholder: "例: 使わなくなった健康器具" },
            { id: "next_want", label: "次に欲しいもの", placeholder: "例: ロボット掃除機" },
        ],
    },

    // -------------------------------------------------------
    // 9. グルメ・食べ物
    // -------------------------------------------------------
    {
        id: "food_gourmet",
        label: "グルメ・食べ物",
        icon: "🍜",
        description: "食の好みで仲良くなる",
        fields: [
            { id: "food_genre", label: "好きな料理ジャンル", placeholder: "例: イタリアン" },
            { id: "signature_dish", label: "得意料理", placeholder: "例: カレー（スパイスから作る）" },
            { id: "soul_food", label: "ソウルフード", placeholder: "例: おばあちゃんの肉じゃが" },
            { id: "recent_delicious", label: "最近食べた美味しいもの", placeholder: "例: 築地の海鮮丼" },
            { id: "disliked_food", label: "苦手な食べ物", placeholder: "例: パクチー" },
            { id: "dream_restaurant", label: "行ってみたいお店", placeholder: "例: 地元で話題の〇〇" },
        ],
    },

    // -------------------------------------------------------
    // 10. 旅行・おでかけ
    // -------------------------------------------------------
    {
        id: "travel",
        label: "旅行・おでかけ",
        icon: "✈️",
        description: "旅の思い出と行きたい場所",
        fields: [
            { id: "favorite_place", label: "一番好きな場所", placeholder: "例: 京都の嵐山" },
            { id: "next_trip", label: "次の旅行先", placeholder: "例: 台湾" },
            { id: "travel_essential", label: "旅行の必需品", placeholder: "例: アイマスクと耳栓" },
            { id: "memorable_experience", label: "印象的だった旅の体験", placeholder: "例: パリで道に迷った" },
            { id: "domestic_recommend", label: "国内のおすすめスポット", placeholder: "例: 屋久島" },
            { id: "travel_style", label: "旅のスタイル", placeholder: "例: 計画派？無計画派？" },
        ],
    },

    // -------------------------------------------------------
    // 11. エンタメ・推し活
    // -------------------------------------------------------
    {
        id: "entertainment",
        label: "エンタメ・推し活",
        icon: "🎬",
        description: "映画・音楽・推しの話で盛り上がる",
        fields: [
            { id: "recent_movie", label: "最近見た映画・ドラマ", placeholder: "例: 最新のアニメ映画" },
            { id: "favorite_artist", label: "好きなアーティスト", placeholder: "例: YOASOBI" },
            { id: "recommend_book", label: "おすすめの本・漫画", placeholder: "例: スラムダンク" },
            { id: "oshi", label: "推し（人・キャラ・概念）", placeholder: "例: 猫" },
            { id: "current_music", label: "最近ハマっている音楽", placeholder: "例: シティポップ" },
            { id: "favorite_channel", label: "好きな配信・チャンネル", placeholder: "例: 料理系の動画" },
        ],
    },

    // -------------------------------------------------------
    // 12. もしも・妄想
    // -------------------------------------------------------
    {
        id: "if_questions",
        label: "もしも・妄想",
        icon: "💭",
        description: "想像力で盛り上がるユニークな質問",
        fields: [
            { id: "lottery_win", label: "宝くじ1億円当たったら", placeholder: "例: 世界一周旅行" },
            { id: "desert_island", label: "無人島に持っていく3つ", placeholder: "例: ナイフ、ライター、釣り竿" },
            { id: "reincarnation", label: "生まれ変わったらなりたいもの", placeholder: "例: 猫" },
            { id: "time_machine", label: "タイムマシンがあったら", placeholder: "例: 恐竜時代を見たい" },
            { id: "superpower", label: "超能力が使えるなら", placeholder: "例: テレポーテーション" },
            { id: "swap_person", label: "1日だけ入れ替われるなら", placeholder: "例: 宇宙飛行士" },
        ],
    },

    // -------------------------------------------------------
    // 13. 趣味・オタ活
    // -------------------------------------------------------
    {
        id: "hobby_otaku",
        label: "趣味・オタ活",
        icon: "🎮",
        description: "ディープな趣味を共有する",
        fields: [
            { id: "main_hobby", label: "一番の趣味", placeholder: "例: ゲーム（RPG中心）" },
            { id: "fav_genre", label: "推しジャンル", placeholder: "例: SF小説" },
            { id: "hobby_budget", label: "趣味に使う月額", placeholder: "例: 1万円くらい" },
            { id: "recent_purchase", label: "最近の趣味の購入品", placeholder: "例: PS5のソフト" },
            { id: "hobby_origin", label: "趣味を始めたきっかけ", placeholder: "例: 友達に誘われて" },
            { id: "evangelize", label: "布教したいコンテンツ", placeholder: "例: 全人類に読んでほしい本" },
        ],
    },

    // -------------------------------------------------------
    // 14. 健康・ライフスタイル
    // -------------------------------------------------------
    {
        id: "health_lifestyle",
        label: "健康・ライフスタイル",
        icon: "🏃",
        description: "日常の習慣と健康意識を共有",
        fields: [
            { id: "exercise_routine", label: "運動習慣", placeholder: "例: 週3でジム通い" },
            { id: "morning_or_night", label: "朝型？夜型？", placeholder: "例: 完全に夜型" },
            { id: "health_habit", label: "健康のためにしていること", placeholder: "例: 毎日1万歩" },
            { id: "sleep_hours", label: "睡眠時間", placeholder: "例: 平均6時間" },
            { id: "stress_relief", label: "ストレス発散法", placeholder: "例: サウナ" },
            { id: "my_routine", label: "マイルーティン", placeholder: "例: 朝のストレッチ15分" },
        ],
    },

    // -------------------------------------------------------
    // 15. ペット・動物
    // -------------------------------------------------------
    {
        id: "pet_animal",
        label: "ペット・動物",
        icon: "🐾",
        description: "動物好き同士で盛り上がる",
        fields: [
            { id: "my_pet", label: "飼っているペット", placeholder: "例: 柴犬のコタロウ" },
            { id: "fav_animal", label: "好きな動物", placeholder: "例: カワウソ" },
            { id: "animal_episode", label: "動物にまつわるエピソード", placeholder: "例: 猫カフェで3時間過ごした" },
            { id: "want_pet", label: "飼いたい動物", placeholder: "例: フクロウ" },
            { id: "animal_self", label: "動物に例えると自分は", placeholder: "例: のんびりしたナマケモノ" },
            { id: "pet_brag", label: "ペットの自慢", placeholder: "例: お手とおかわりができる！" },
        ],
    },

    // -------------------------------------------------------
    // 16. 子ども時代
    // -------------------------------------------------------
    {
        id: "childhood",
        label: "子ども時代",
        icon: "👒",
        description: "幼少期の思い出で心が和む",
        fields: [
            { id: "school_memory", label: "小学校の思い出", placeholder: "例: ドッジボール大会で優勝" },
            { id: "childhood_play", label: "子どもの頃の遊び", placeholder: "例: 秘密基地づくり" },
            { id: "fav_school_lunch", label: "好きだった給食メニュー", placeholder: "例: 揚げパン" },
            { id: "summer_memory", label: "夏休みの思い出", placeholder: "例: おばあちゃん家で虫取り" },
            { id: "childhood_nickname", label: "子どもの頃のあだ名", placeholder: "例: たっくん" },
            { id: "collected_items", label: "集めていたもの", placeholder: "例: ビックリマンシール" },
        ],
    },

    // -------------------------------------------------------
    // 17. 特技・隠れた才能
    // -------------------------------------------------------
    {
        id: "skills_talents",
        label: "特技・隠れた才能",
        icon: "✨",
        description: "知られざる一面を発見",
        fields: [
            { id: "proud_skill", label: "自慢の特技", placeholder: "例: けん玉の大技ができる" },
            { id: "unexpected_skill", label: "意外と得意なこと", placeholder: "例: 料理の盛り付け" },
            { id: "certification", label: "資格・検定", placeholder: "例: 漢検2級" },
            { id: "expert_knowledge", label: "誰にも負けない知識", placeholder: "例: 戦国武将のエピソード" },
            { id: "recent_skill", label: "最近身につけたスキル", placeholder: "例: Excel のマクロ" },
            { id: "party_trick", label: "パーティーで使える一芸", placeholder: "例: マジック" },
        ],
    },

    // -------------------------------------------------------
    // 18. 年末年始・振り返り
    // -------------------------------------------------------
    {
        id: "seasonal_yearend",
        label: "年末年始・振り返り",
        icon: "🎍",
        description: "今年の振り返りと新年の抱負",
        fields: [
            { id: "biggest_event", label: "今年いちばんの出来事", placeholder: "例: 転職した" },
            { id: "next_year_goal", label: "来年の抱負", placeholder: "例: 英語を話せるようになる" },
            { id: "yearend_plan", label: "年末年始の過ごし方", placeholder: "例: 実家に帰省" },
            { id: "new_start", label: "今年始めた新しいこと", placeholder: "例: ボルダリング" },
            { id: "best_content", label: "今年観た最高のコンテンツ", placeholder: "例: 映画「〇〇」" },
            { id: "kanji_of_year", label: "今年の漢字一文字", placeholder: "例: 「挑」" },
        ],
    },

    // -------------------------------------------------------
    // 19. ランダム・おもしろ
    // -------------------------------------------------------
    {
        id: "random_fun",
        label: "ランダム・おもしろ",
        icon: "🎲",
        description: "予想外の質問で笑いを誘う",
        fields: [
            { id: "last_laugh", label: "最後に声を出して笑ったこと", placeholder: "例: 猫の動画" },
            { id: "humble_brag", label: "地味に自慢できること", placeholder: "例: 寝つきが良い" },
            { id: "faction", label: "きのこ派？たけのこ派？", placeholder: "例: たけのこ派！" },
            { id: "biggest_fail", label: "人生最大のやらかし", placeholder: "例: 寝坊して飛行機に乗り遅れた" },
            { id: "never_done", label: "実はまだやったことないこと", placeholder: "例: スカイダイビング" },
            { id: "weird_habit", label: "謎のこだわり", placeholder: "例: タオルの畳み方" },
        ],
    },

    // -------------------------------------------------------
    // 20. 価値観・哲学
    // -------------------------------------------------------
    {
        id: "values_philosophy",
        label: "価値観・哲学",
        icon: "📚",
        description: "深い対話のきっかけに",
        fields: [
            { id: "motto", label: "座右の銘", placeholder: "例: 「為せば成る」" },
            { id: "life_priority", label: "人生で大切にしていること", placeholder: "例: 家族との時間" },
            { id: "influential_work", label: "影響を受けた本・映画", placeholder: "例: 「星の王子さま」" },
            { id: "my_strength", label: "自分の強み", placeholder: "例: どんな状況でも前向きでいられる" },
            { id: "happy_moment", label: "幸せを感じる瞬間", placeholder: "例: 美味しいものを食べているとき" },
            { id: "message_to_future", label: "未来の自分へのメッセージ", placeholder: "例: 焦らず自分のペースで" },
        ],
    },
] as const;

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * プリセット ID からプリセットを取得する。
 * 存在しない ID の場合は undefined を返す。
 */
export function getPresetById(id: ProfileFieldPresetId): ProfileFieldPreset | undefined {
    return PROFILE_FIELD_PRESETS.find((p) => p.id === id);
}
