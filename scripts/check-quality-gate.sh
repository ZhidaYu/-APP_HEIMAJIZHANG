#!/bin/bash
# 质量闸机：检查是否有有效的通行证
# 被 PreToolUse hook 调用，拦截 git commit 时触发
#
# exit 0 = 放行（允许 commit）
# exit 2 = 拒绝（不允许 commit）
#
# 通行证文件：
#   tester-result.txt  — tester agent 签发，第一行 PASS 或 FAIL
#   quality-result.txt — quality-engineer agent 签发，第一行 PASS 或 FAIL
#
# 机制：只读第一行，两个文件第一行都是 PASS 才放行
#       缺了任何一个文件，或任一文件第一行不是 PASS，都拒绝

# 使用脚本自身位置推导项目根目录（无论从哪里调用都能找到）
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEST_FILE="$PROJECT_DIR/tester-result.txt"
QUALITY_FILE="$PROJECT_DIR/quality-result.txt"

# ── 第一关：检查测试通行证 ──

if [ ! -f "$TEST_FILE" ]; then
  echo ""
  echo "=========================================="
  echo "  [拒绝] 没有测试通行证"
  echo "------------------------------------------"
  echo "  提交被闸机拦截！"
  echo ""
  echo "  请先完成以下步骤之一："
  echo "  1. 说 [帮我提交代码] 一键完成"
  echo "  2. 运行 /unit-test 完成测试"
  echo "=========================================="
  echo ""
  exit 2
fi

TEST_RESULT=$(head -1 "$TEST_FILE")
if [ "$TEST_RESULT" != "PASS" ]; then
  echo ""
  echo "=========================================="
  echo "  [拒绝] 单元测试未通过！"
  echo "------------------------------------------"
  echo "  提交被闸机拦截！"
  echo ""
  echo "  测试结果：$TEST_RESULT"
  echo "=========================================="
  echo ""
  cat "$TEST_FILE"
  echo ""
  exit 2
fi

# ── 第二关：检查质量通行证 ──

if [ ! -f "$QUALITY_FILE" ]; then
  echo ""
  echo "=========================================="
  echo "  [拒绝] 没有质量审查通行证"
  echo "------------------------------------------"
  echo "  提交被闸机拦截！"
  echo ""
  echo "  请先完成以下步骤之一："
  echo "  1. 说 [帮我提交代码] 一键完成"
  echo "  2. 运行质量审查后重试"
  echo "=========================================="
  echo ""
  exit 2
fi

QUALITY_RESULT=$(head -1 "$QUALITY_FILE")
if [ "$QUALITY_RESULT" != "PASS" ]; then
  echo ""
  echo "=========================================="
  echo "  [拒绝] 代码质量审查未通过！"
  echo "------------------------------------------"
  echo "  提交被闸机拦截！"
  echo ""
  echo "  质量结果：$QUALITY_RESULT"
  echo "=========================================="
  echo ""
  cat "$QUALITY_FILE"
  echo ""
  exit 2
fi

# ── 两关都过：放行 ──

echo ""
echo "=========================================="
echo "  [通过] 质量检查已通过"
echo "------------------------------------------"
echo "  测试 + 审查均已通过，闸机打开，允许提交"
echo "=========================================="
echo ""
exit 0
