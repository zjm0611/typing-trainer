/* ============================================================
 * data.js — 练习语料库
 * 所有文本均为纯数据，供 app.js 取用。
 * ============================================================ */

const DATA = {};

/* ---------- 1. 常用英文单词（按词频排序，覆盖日常与办公） ---------- */
DATA.wordsCommon = [
  'the', 'of', 'and', 'to', 'in', 'is', 'you', 'that', 'it', 'he',
  'was', 'for', 'on', 'are', 'as', 'with', 'his', 'they', 'at', 'be',
  'this', 'have', 'from', 'or', 'one', 'had', 'by', 'word', 'but', 'not',
  'what', 'all', 'were', 'we', 'when', 'your', 'can', 'said', 'there', 'use',
  'an', 'each', 'which', 'she', 'do', 'how', 'their', 'if', 'will', 'up',
  'other', 'about', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her',
  'would', 'make', 'like', 'him', 'into', 'time', 'has', 'look', 'two', 'more',
  'write', 'go', 'see', 'number', 'no', 'way', 'could', 'people', 'my', 'than',
  'first', 'water', 'been', 'call', 'who', 'its', 'now', 'find', 'long', 'down',
  'day', 'did', 'get', 'come', 'made', 'may', 'part', 'over', 'new', 'sound',
  'take', 'only', 'little', 'work', 'know', 'place', 'year', 'live', 'me', 'back',
  'give', 'most', 'very', 'after', 'thing', 'our', 'just', 'name', 'good', 'man',
  'think', 'say', 'great', 'where', 'help', 'through', 'much', 'before', 'line', 'right',
  'too', 'mean', 'old', 'any', 'same', 'tell', 'boy', 'follow', 'came', 'want',
  'show', 'also', 'around', 'form', 'three', 'small', 'set', 'put', 'end', 'does',
  'another', 'well', 'large', 'must', 'big', 'even', 'such', 'because', 'turn', 'here',
  'why', 'ask', 'went', 'men', 'read', 'need', 'land', 'different', 'home', 'us',
  'move', 'try', 'kind', 'hand', 'picture', 'again', 'change', 'off', 'play', 'spell',
  'air', 'away', 'animal', 'house', 'point', 'page', 'letter', 'mother', 'answer', 'found',
  'study', 'still', 'learn', 'should', 'world', 'every', 'near', 'add', 'food', 'between',
  'own', 'below', 'country', 'plant', 'last', 'school', 'father', 'keep', 'tree', 'never',
  'start', 'city', 'earth', 'eye', 'light', 'thought', 'head', 'under', 'story', 'saw',
  'left', 'few', 'while', 'along', 'might', 'close', 'something', 'seem', 'next', 'hard',
  'open', 'example', 'begin', 'life', 'always', 'those', 'both', 'paper', 'together', 'got',
  'group', 'often', 'run', 'important', 'until', 'children', 'side', 'feet', 'car', 'mile',
  'night', 'walk', 'white', 'sea', 'began', 'grow', 'took', 'river', 'four', 'carry',
  'state', 'once', 'book', 'hear', 'stop', 'without', 'second', 'later', 'miss', 'idea'
];

/* ---------- 2. 进阶词汇（较长、拼写更复杂） ---------- */
DATA.wordsAdvanced = [
  'ability', 'absolute', 'academic', 'accurate', 'achieve', 'acknowledge', 'acquire', 'adapt',
  'adequate', 'adjacent', 'advocate', 'aggregate', 'allocate', 'alternative', 'ambiguous',
  'analysis', 'anticipate', 'apparent', 'approach', 'appropriate', 'arbitrary', 'architecture',
  'assemble', 'assessment', 'assumption', 'attribute', 'authority', 'available', 'awareness',
  'beneficial', 'boundary', 'capability', 'category', 'challenge', 'characteristic', 'circumstance',
  'coherent', 'collapse', 'commitment', 'compensate', 'competent', 'complexity', 'comprehensive',
  'conceptual', 'conclude', 'concurrent', 'confidence', 'consequence', 'considerable', 'consistent',
  'constraint', 'construct', 'contemporary', 'context', 'continuous', 'contribute', 'convenient',
  'conventional', 'coordinate', 'corporate', 'correspond', 'criterion', 'critical', 'cumulative',
  'demonstrate', 'dependent', 'derive', 'diagnose', 'dimension', 'discipline', 'distinguish',
  'distribute', 'diverse', 'dominant', 'dramatic', 'dynamic', 'efficient', 'elaborate',
  'element', 'eliminate', 'emerge', 'emphasis', 'empirical', 'enormous', 'ensure', 'enterprise',
  'enthusiasm', 'environment', 'equivalent', 'essential', 'establish', 'estimate', 'evaluate',
  'eventually', 'evidence', 'evolve', 'exception', 'exclusive', 'execute', 'explicit',
  'exposure', 'external', 'facilitate', 'familiar', 'feasible', 'flexible', 'formulate',
  'frequent', 'fundamental', 'generate', 'genuine', 'gradually', 'guarantee', 'hierarchy',
  'hypothesis', 'identify', 'illustrate', 'immediate', 'implement', 'implication', 'incentive',
  'incidence', 'indicate', 'individual', 'inevitable', 'influence', 'initial', 'innovative',
  'insight', 'inspection', 'integrate', 'integrity', 'intensity', 'interpret', 'interval',
  'intervention', 'intrinsic', 'investigate', 'isolate', 'justify', 'legitimate', 'mechanism',
  'minimize', 'moderate', 'negotiate', 'nevertheless', 'objective', 'obvious', 'operate',
  'opportunity', 'optimize', 'outcome', 'overwhelming', 'parameter', 'participate', 'particular',
  'perceive', 'performance', 'permanent', 'perspective', 'phenomenon', 'philosophy', 'potential',
  'practical', 'precede', 'precise', 'predominant', 'preliminary', 'preserve', 'presume',
  'prevail', 'priority', 'procedure', 'profound', 'prohibit', 'prominent', 'proportion',
  'prospect', 'protocol', 'provision', 'publish', 'pursue', 'qualitative', 'quantitative',
  'recognize', 'recommend', 'reconcile', 'reduce', 'reference', 'reflect', 'regulate',
  'reinforce', 'relevant', 'reluctant', 'remarkable', 'remedy', 'represent', 'reputation',
  'require', 'resemble', 'residual', 'resolve', 'resource', 'restrain', 'restrict', 'retrieve',
  'reveal', 'revenue', 'rigorous', 'scenario', 'scrutiny', 'sequence', 'significant', 'similar',
  'sophisticated', 'specific', 'speculate', 'stability', 'statistic', 'straightforward',
  'strategy', 'structure', 'subsequent', 'substantial', 'substitute', 'sufficient', 'summarize',
  'supplement', 'suppress', 'sustain', 'symbolic', 'systematic', 'tangible', 'technique',
  'temporary', 'tendency', 'terminate', 'theoretical', 'threshold', 'tolerance', 'transfer',
  'transformation', 'transmit', 'transparent', 'ultimate', 'underlying', 'undertake', 'uniform',
  'validate', 'variable', 'vehicle', 'venture', 'verify', 'version', 'vertical', 'virtually',
  'visible', 'voluntary', 'widespread', 'withstand', 'yield'
];

/* ---------- 3. 编程常用词与符号组合 ---------- */
DATA.wordsCode = [
  'const', 'let', 'var', 'function', 'return', 'async', 'await', 'import', 'export', 'default',
  'class', 'extends', 'super', 'this', 'static', 'public', 'private', 'protected', 'interface',
  'type', 'enum', 'struct', 'impl', 'trait', 'def', 'lambda', 'yield', 'raise', 'except',
  'try', 'catch', 'finally', 'throw', 'while', 'for', 'foreach', 'switch', 'case', 'break',
  'continue', 'else', 'elif', 'null', 'None', 'true', 'false', 'True', 'False', 'nil',
  'undefined', 'typeof', 'instanceof', 'delete', 'new', 'void', 'int', 'float', 'double',
  'string', 'boolean', 'array', 'object', 'list', 'tuple', 'dict', 'set', 'map', 'filter',
  'reduce', 'forEach', 'push', 'pop', 'shift', 'slice', 'splice', 'concat', 'length', 'index',
  'key', 'value', 'entry', 'item', 'node', 'root', 'leaf', 'tree', 'graph', 'queue', 'stack',
  'heap', 'hash', 'cache', 'buffer', 'stream', 'server', 'client', 'request', 'response',
  'header', 'body', 'route', 'params', 'query', 'cookie', 'token', 'session', 'auth',
  'query', 'insert', 'update', 'select', 'where', 'group', 'order', 'limit', 'offset', 'join'
];

/* ---------- 4. 名言句子（英文） ---------- */
DATA.quotes = [
  'The only way to do great work is to love what you do.',
  'Simplicity is the ultimate sophistication in software design.',
  'A language that does not affect the way you think about programming is not worth knowing.',
  'Programs must be written for people to read, and only incidentally for machines to execute.',
  'Talk is cheap. Show me the code.',
  'The best error message is the one that never shows up.',
  'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.',
  'Premature optimization is the root of all evil.',
  'It is not the strongest of the species that survives, but the most responsive to change.',
  'Success is the sum of small efforts repeated day in and day out.',
  'The secret of getting ahead is getting started without waiting for perfect conditions.',
  'Discipline is choosing between what you want now and what you want most.',
  'Knowledge is of no value unless you put it into practice.',
  'The measure of intelligence is the ability to change and keep learning.',
  'In the middle of difficulty lies opportunity waiting to be discovered.',
  'Writing is thinking on paper, and clear writing comes from clear thinking.',
  'Focus is not about saying yes to the right thing, but saying no to the rest.',
  'Small daily improvements over time lead to stunning results.',
  'The most dangerous kind of waste is the waste we do not recognize.',
  'If you cannot explain it simply, you do not understand it well enough.',
  'Quality is never an accident; it is always the result of intelligent effort.',
  'Courage is not the absence of fear, but the judgment that something else matters more.',
  'A ship in harbor is safe, but that is not what ships are built for.',
  'Time is the most valuable thing a person can spend.',
  'The best time to plant a tree was twenty years ago. The second best time is now.',
  'Do not go where the path may lead, go instead where there is no path and leave a trail.',
  'Learning never exhausts the mind, it only makes it sharper.',
  'Every problem is a gift, without problems we would not grow.',
  'Perfection is achieved when there is nothing left to take away.',
  'Reading is to the mind what exercise is to the body.'
];

/* ---------- 5. 代码片段（每行控制在 70 字符内，保证不折行） ---------- */
DATA.code = {

  javascript: [
    'const fetchUser = async (id) => {',
    '  const res = await fetch(`/api/users/${id}`);',
    '  if (!res.ok) throw new Error(`HTTP ${res.status}`);',
    '  const data = await res.json();',
    '  return { id: data.id, name: data.name };',
    '};',
    '',
    'function debounce(fn, wait = 300) {',
    '  let timer = null;',
    '  return (...args) => {',
    '    clearTimeout(timer);',
    '    timer = setTimeout(() => fn(...args), wait);',
    '  };',
    '}',
    '',
    'const groupBy = (list, keyFn) =>',
    '  list.reduce((acc, item) => {',
    '    const key = keyFn(item);',
    '    (acc[key] ||= []).push(item);',
    '    return acc;',
    '  }, {});'
  ].join('\n'),

  python: [
    'import json',
    'from dataclasses import dataclass',
    'from typing import Iterable',
    '',
    '',
    '@dataclass',
    'class Record:',
    '    name: str',
    '    score: float = 0.0',
    '',
    '    def is_pass(self, threshold: float = 60.0) -> bool:',
    '        return self.score >= threshold',
    '',
    '',
    'def top_k(records: Iterable[Record], k: int = 3):',
    '    ordered = sorted(records, key=lambda r: r.score, reverse=True)',
    '    return ordered[:k]',
    '',
    '',
    'if __name__ == "__main__":',
    '    data = [Record("alice", 91.5), Record("bob", 58.0)]',
    '    print(json.dumps([r.name for r in top_k(data)]))'
  ].join('\n'),

  sql: [
    'SELECT',
    '  u.id,',
    '  u.name,',
    '  COUNT(o.id) AS order_count,',
    '  SUM(o.amount) AS total_amount',
    'FROM users AS u',
    'LEFT JOIN orders AS o',
    '  ON o.user_id = u.id',
    '  AND o.created_at >= DATE(\'now\', \'-30 days\')',
    'WHERE u.status = \'active\'',
    'GROUP BY u.id, u.name',
    'HAVING SUM(o.amount) > 1000',
    'ORDER BY total_amount DESC',
    'LIMIT 20;'
  ].join('\n'),

  cpp: [
    '#include <iostream>',
    '#include <vector>',
    '#include <algorithm>',
    '',
    'template <typename T>',
    'T sum(const std::vector<T>& v) {',
    '    T total = T{};',
    '    for (const auto& x : v) total += x;',
    '    return total;',
    '}',
    '',
    'int main() {',
    '    std::vector<int> nums{4, 8, 15, 16, 23, 42};',
    '    std::sort(nums.begin(), nums.end());',
    '    std::cout << "sum = " << sum(nums) << std::endl;',
    '    return 0;',
    '}'
  ].join('\n')
};

/* ---------- 6. 数字与符号 ---------- */
DATA.symbolsRaw = '`~!@#$%^&*()-_=+[]{};:\'",.<>/?\\|';
DATA.digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/* ---------- 7. 中文句子（配合输入法练习） ---------- */
DATA.chinese = [
  '持之以恒的练习，是任何技能从生疏走向熟练的唯一路径。',
  '把复杂的事情拆解成简单的步骤，是解决问题最有效的方法。',
  '读书不是为了记住每一句话，而是为了在需要时能够想起它。',
  '真正的效率并不来自更快的速度，而来自更少的返工与犹豫。',
  '每天进步一点点，一年之后你会感谢此刻坚持的自己。',
  '把注意力放在可以改变的事情上，把其余的交给时间。',
  '写清楚一件事的前提，是你真的想清楚了一件事。',
  '与其纠结从哪里开始，不如先迈出最小的那一步。',
  '认真对待每一个细节，结果自然不会太差。',
  '把时间花在值得的地方，是对自己最好的投资。',
  '遇到困难时先深呼吸，然后把它拆成一个更小的问题。',
  '所有看起来轻松的熟练，背后都是大量重复的练习。',
  '把目标写在纸上，比放在脑海里更容易实现。',
  '耐心不是等待的能力，而是在等待中继续努力的能力。',
  '衡量进步的方式，是今天比昨天多知道了什么。',
  '安静下来做事，比四处寻找捷径走得更远。',
  '专注一小时，胜过心不在焉地忙碌一整天。',
  '愿意承认自己不懂的人，往往学得最快。',
  '习惯的力量在于，它会把努力变成自然而然的事情。',
  '慢一点没关系，只要方向是对的。'
];

/* ---------- 8. 中文短文段落（较长练习） ---------- */
DATA.chineseParagraphs = [
  '清晨的城市还没有完全醒来，街边的早餐摊已经支起了棚子，热气从锅里升腾起来，混着葱花和面香。骑车的人从旁边经过，车筐里放着文件和保温杯，步履匆匆却并不慌乱。一天从这样的时刻开始，平淡、重复，却也有它自己的秩序。',
  '学习一门新技术，最难的往往不是理解概念，而是接受自己一开始做得很差。前几天的挫败感会让人怀疑选择，可只要坚持把每天的任务完成，几个星期之后再回头看，那些曾经晦涩的东西会变得清晰起来。',
  '写作是把混乱的思考整理成清晰表达的过程。你不可能一边想着十几个要点一边写出通顺的段落，所以必须先决定哪一句最重要，把它放在开头，然后让其余的句子依次为它服务。删掉的内容往往比留下的更能说明问题。'
];

/* ---------- 9. 组合标点，用于生成带标点的单词流 ---------- */
DATA.punctuationMap = {
  ',': 0.4,
  '.': 0.3,
  '?': 0.05,
  '!': 0.05,
  ';': 0.05,
  ':': 0.05,
  "'": 0.1
};
