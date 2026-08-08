/**
 * 支出与收入分类数据（纯数据定义）
 *
 * ⚠️ 本文件只包含分类的「数据」——常量数组和颜色映射。
 * 所有查询、查找、合并等「逻辑函数」在 categories.ts 中。
 *
 * 修改分类数据时，只改这个文件，然后同步更新 CLAUDE.md 中的分类表。
 *
 * ## 修改分类的注意事项
 * 1. key 使用英文下划线命名，全局唯一（不能有两个相同的 key）
 * 2. label 使用简体中文
 * 3. 不要在用户已有数据后删除或重命名 key——这会导致旧数据的分类变成"未知分类"
 */
import type { PrimaryCategory, SubCategory, PaymentOption } from './types'

// ============================================================================
// 第一部分：支出分类数据（10 大类，40+ 小类）
// ============================================================================

/** 支出一级分类 + 二级分类完整数据 */
export const PRIMARY_CATEGORIES: PrimaryCategory[] = [
  {
    key: 'food',
    label: '餐饮饮食',
    icon: '🍽️',
    children: [
      { key: 'meal_daily', label: '三餐日常', description: '早午晚餐等日常吃饭' },
      { key: 'snack_drink', label: '零食饮料', description: '零食、奶茶、咖啡、饮料' },
      { key: 'takeout', label: '外卖外送', description: '美团、饿了么等外卖点餐' },
      { key: 'group_dining', label: '聚餐聚会', description: '朋友聚餐、同事聚会、请客吃饭' }
    ]
  },
  {
    key: 'transport',
    label: '交通出行',
    icon: '🚗',
    children: [
      { key: 'public_transit', label: '公共交通', description: '公交、地铁、轮渡' },
      { key: 'ride_hailing', label: '网约车/出租车', description: '滴滴、花小猪、出租车' },
      { key: 'car_expense', label: '私家车费用', description: '加油、充电、过路费、停车、保养' },
      { key: 'train_flight', label: '火车/飞机', description: '高铁、动车、机票' }
    ]
  },
  {
    key: 'shopping',
    label: '购物消费',
    icon: '🛒',
    children: [
      { key: 'daily_needs', label: '日常用品', description: '洗漱用品、纸巾、清洁用品' },
      { key: 'clothing', label: '服装鞋帽', description: '衣服、鞋子、帽子、配饰' },
      { key: 'electronics', label: '数码产品', description: '手机、电脑、耳机、数据线等' },
      { key: 'home_decor', label: '家居装饰', description: '家具、灯具、装饰品、厨具' }
    ]
  },
  {
    key: 'housing',
    label: '住房物业',
    icon: '🏠',
    children: [
      { key: 'rent_mortgage', label: '房租/房贷', description: '每月房租或房贷还款' },
      { key: 'utilities', label: '水电燃气', description: '水费、电费、燃气费' },
      { key: 'property_mgmt', label: '物业费用', description: '物业管理费、垃圾清运费' },
      { key: 'maintenance', label: '维修保养', description: '水管维修、电器维修、墙面修补等' }
    ]
  },
  {
    key: 'entertainment',
    label: '休闲娱乐',
    icon: '🎮',
    children: [
      { key: 'movie_show', label: '电影演出', description: '电影票、演唱会、话剧、展览' },
      { key: 'travel', label: '旅游度假', description: '酒店住宿、景点门票、旅行团费' },
      { key: 'sports_fitness', label: '运动健身', description: '健身房会员、运动器材、游泳' },
      { key: 'game_topup', label: '游戏充值', description: '手游、端游的充值和购买' }
    ]
  },
  {
    key: 'healthcare',
    label: '医疗健康',
    icon: '💊',
    children: [
      { key: 'doctor_visit', label: '看病挂号', description: '医院挂号费、门诊费' },
      { key: 'medicine', label: '药品购买', description: '药店买药、处方药' },
      { key: 'health_checkup', label: '体检检查', description: '年度体检、专项检查' },
      { key: 'wellness', label: '保健养生', description: '保健品、按摩理疗、中医调理' }
    ]
  },
  {
    key: 'education',
    label: '学习教育',
    icon: '📚',
    children: [
      { key: 'training', label: '培训课程', description: '线上/线下培训、兴趣班、辅导班' },
      { key: 'books', label: '书籍资料', description: '纸质书、电子书、学习资料' },
      { key: 'stationery', label: '文具用品', description: '笔、本子、文件夹等' },
      { key: 'exam_fee', label: '考试报名', description: '各类考试报名费' }
    ]
  },
  {
    key: 'social',
    label: '人情社交',
    icon: '🎁',
    children: [
      { key: 'gift_redpacket', label: '红包礼金', description: '微信红包、婚礼份子钱、生日礼物' },
      { key: 'family_support', label: '孝敬长辈', description: '给父母/长辈的生活费或买东西' },
      { key: 'pet_expense', label: '宠物支出', description: '猫粮狗粮、宠物医疗、宠物用品' },
      { key: 'donation', label: '公益捐款', description: '慈善捐款、水滴筹等' }
    ]
  },
  {
    key: 'finance',
    label: '金融保险',
    icon: '💰',
    children: [
      { key: 'insurance', label: '保险费用', description: '社保、商业保险、车险' },
      { key: 'loan_interest', label: '贷款利息', description: '房贷/车贷/消费贷利息' },
      { key: 'investment', label: '投资理财', description: '股票、基金、理财产品（可选记录）' },
      { key: 'bank_fee', label: '手续费', description: '银行转账、提现手续费' }
    ]
  },
  {
    key: 'others',
    label: '其他支出',
    icon: '📦',
    children: [
      { key: 'shipping', label: '快递运费', description: '寄快递、网购退货运费' },
      { key: 'beauty_salon', label: '美容美发', description: '理发、烫染、护肤、美甲' },
      { key: 'misc', label: '其他杂项', description: '以上分类无法覆盖的支出' }
    ]
  }
]

// ============================================================================
// 第二部分：收入分类数据（5 大类，15 小类）
// ============================================================================

/** 收入一级分类 */
export const INCOME_CATEGORIES: PrimaryCategory[] = [
  {
    key: 'salary',
    label: '工资薪金',
    icon: '💼',
    children: [
      { key: 'monthly_salary', label: '月薪', description: '每月固定工资收入' },
      { key: 'bonus', label: '奖金年终', description: '绩效奖金、年终奖' },
      { key: 'overtime', label: '加班补贴', description: '加班费、补贴' }
    ]
  },
  {
    key: 'side_job',
    label: '兼职副业',
    icon: '🔧',
    children: [
      { key: 'freelance', label: '自由职业', description: '接单、设计、翻译等自由工作' },
      { key: 'part_time', label: '兼职打工', description: '兼职、临时工作收入' },
      { key: 'self_media', label: '自媒体', description: '视频、文章、直播等创作收入' }
    ]
  },
  {
    key: 'investment_income',
    label: '投资理财',
    icon: '📈',
    children: [
      { key: 'stock_fund', label: '股票基金', description: '股票、基金等投资收益' },
      { key: 'interest', label: '利息收入', description: '存款利息、债券利息' },
      { key: 'rental_income', label: '房租收入', description: '出租房屋的收入' }
    ]
  },
  {
    key: 'transfer_in',
    label: '转账收入',
    icon: '💳',
    children: [
      { key: 'family_give', label: '家人转账', description: '父母/家人给的钱' },
      { key: 'redpacket_in', label: '红包收入', description: '微信红包、支付宝红包' },
      { key: 'refund', label: '退款返现', description: '购物退款、返现' }
    ]
  },
  {
    key: 'other_income',
    label: '其他收入',
    icon: '📦',
    children: [
      { key: 'second_hand', label: '二手出售', description: '卖闲置物品的收入' },
      { key: 'award', label: '奖金中奖', description: '竞赛奖金、彩票中奖等' },
      { key: 'misc_income', label: '其他来源', description: '以上无法覆盖的收入' }
    ]
  }
]

// ============================================================================
// 第三部分：颜色映射
// ============================================================================

/**
 * 收入分类的颜色映射
 *
 * 每个一级收入分类有独立的颜色，用于：
 * - 饼图中不同扇区的颜色
 * - 列表页面的分类标签底色
 * - 统计报表中的图例
 *
 * 支出分类的颜色在下面的 CATEGORY_COLORS 中定义
 */
export const INCOME_COLORS: Record<string, string> = {
  salary: '#059669',           // 深绿色 — 代表工资（稳定、成长）
  side_job: '#0284C7',        // 蓝色 — 代表副业（灵活、多元）
  investment_income: '#D97706', // 琥珀色 — 代表投资（金灿灿）
  transfer_in: '#7C3AED',     // 紫色 — 代表转账（流转）
  other_income: '#6B7280'     // 灰色 — 代表其他（中性）
}

/**
 * 支出一级分类的颜色映射
 *
 * 每个一级分类一个独特颜色，用于：
 * - 列表每条记录左侧的颜色圆点（快速识别类别）
 * - 饼图中不同扇区的颜色
 * - 分类筛选按钮的标识色
 */
export const CATEGORY_COLORS: Record<string, string> = {
  food: '#F97316',           // 橙色 — 餐饮
  transport: '#3B82F6',      // 蓝色 — 交通
  shopping: '#EC4899',       // 粉色 — 购物
  housing: '#8B5CF6',        // 紫色 — 住房
  entertainment: '#10B981',  // 绿色 — 娱乐
  healthcare: '#EF4444',     // 红色 — 医疗
  education: '#6366F1',      // 靛蓝 — 学习
  social: '#F59E0B',         // 琥珀 — 社交
  finance: '#06B6D4',        // 青色 — 金融
  others: '#6B7280'          // 灰色 — 其他
}

// ============================================================================
// 第四部分：支付方式
// ============================================================================

/** 支付方式选项（记账表单中的选择列表、筛选条件） */
export const PAYMENT_METHODS: PaymentOption[] = [
  { key: 'wechat', label: '微信支付', icon: '💚' },
  { key: 'alipay', label: '支付宝', icon: '💙' },
  { key: 'bank_card', label: '银行卡', icon: '🧡' },
  { key: 'cash', label: '现金', icon: '🤍' },
  { key: 'other', label: '其他', icon: '⚙️' }
]

// ============================================================================
// 第五部分：辅助查询函数
