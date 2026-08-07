import React, { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { ExpenseRecord } from '../../shared/types'
import { PRIMARY_CATEGORIES } from '../../shared/categories'

interface StatsPageProps {
  records: ExpenseRecord[]
  formatAmount: (cents: number) => string
}

/** 分类颜色 */
const CATEGORY_COLORS = [
  '#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981',
  '#06B6D4', '#6366F1', '#8B5CF6', '#F43F5E', '#EAB308'
]

/**
 * 月度统计页面
 * 包含：月度概览、饼图（分类占比）、折线图（每日消费趋势）、分类明细
 */
const StatsPage: React.FC<StatsPageProps> = ({ records, formatAmount }) => {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  // 月份切换
  const goPrevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const goNextMonth = () => {
    const isFuture = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)
    if (isFuture) return
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  // ===== 当月统计 =====
  const monthStats = useMemo(() => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    const monthRecords = records.filter(r => r.date.startsWith(prefix))
    const total = monthRecords.reduce((sum, r) => sum + r.amount, 0)

    // 饼图数据：按一级分类汇总
    const pieData = PRIMARY_CATEGORIES
      .map(cat => {
        const amt = monthRecords.filter(r => r.primaryCategory === cat.key).reduce((s, r) => s + r.amount, 0)
        return { name: cat.label, icon: cat.icon, value: amt }
      })
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)

    // 折线图数据：每日消费趋势
    const daysInMon = daysInMonth(year, month)
    const lineData: { day: string; 金额: number }[] = []
    for (let d = 1; d <= daysInMon; d++) {
      const dayStr = `${prefix}-${String(d).padStart(2, '0')}`
      const dayTotal = monthRecords.filter(r => r.date === dayStr).reduce((s, r) => s + r.amount, 0)
      lineData.push({ day: `${d}日`, 金额: dayTotal / 100 })
    }

    return {
      total,
      recordCount: monthRecords.length,
      dailyAvg: monthRecords.length > 0 ? Math.round(total / daysInMon) : 0,
      pieData,
      lineData
    }
  }, [records, year, month])

  const { total, recordCount, dailyAvg, pieData, lineData } = monthStats

  // 判断是否当前月份
  const disabledNext = year === now.getFullYear() && month >= now.getMonth() + 1

  return (
    <div className="stats-page">
      {/* 月份选择器 */}
      <div className="month-picker">
        <button className="month-arrow" onClick={goPrevMonth}>‹</button>
        <span className="month-title">{year}年{month}月</span>
        <button className={`month-arrow ${disabledNext ? 'disabled' : ''}`} onClick={goNextMonth} disabled={disabledNext}>›</button>
      </div>

      {/* 概览卡片 */}
      <div className="stats-overview">
        <div className="overview-card">
          <div className="overview-label">总支出</div>
          <div className="overview-amount">{formatAmount(total)}</div>
        </div>
        <div className="overview-card">
          <div className="overview-label">记账笔数</div>
          <div className="overview-amount">{recordCount} 笔</div>
        </div>
        <div className="overview-card">
          <div className="overview-label">日均支出</div>
          <div className="overview-amount">{recordCount > 0 ? formatAmount(dailyAvg) : '¥0.00'}</div>
        </div>
      </div>

      {recordCount === 0 ? (
        <div className="empty-state" style={{ minHeight: 200 }}>
          <div className="empty-icon">📊</div>
          <p className="empty-title">本月暂无支出记录</p>
          <p className="empty-hint">去记账页面添加记录吧</p>
        </div>
      ) : (
        <>
          {/* ===== 饼图：分类占比 ===== */}
          <div className="chart-section">
            <h4 className="section-title">🍩 分类消费占比</h4>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={true}
                  >
                    {pieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatAmount(value * 100)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ===== 折线图：每日消费趋势 ===== */}
          <div className="chart-section">
            <h4 className="section-title">📈 每日消费趋势</h4>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={lineData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    tickLine={false}
                    interval={Math.max(0, Math.floor(lineData.length / 7) - 1)}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [`¥${value.toFixed(2)}`, '支出']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="金额"
                    stroke="#4F46E5"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#4F46E5' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ===== 分类明细列表 ===== */}
          <div className="chart-section">
            <h4 className="section-title">📋 分类明细</h4>
            {pieData.map((cat, i) => (
              <div key={cat.name} className="detail-row">
                <div className="detail-dot" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                <span className="detail-label">{cat.icon} {cat.name}</span>
                <span className="detail-amount">{formatAmount(cat.value)}</span>
                <span className="detail-percent">
                  {total > 0 ? `${Math.round((cat.value / total) * 100)}%` : '0%'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export default StatsPage
