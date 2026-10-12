/**
 * Temporary conservative name-to-category suggestions for Product Entry.
 * Suggestions MUST resolve to an existing option in the category selector;
 * ambiguous names stay unclassified for the operator to review.
 *
 * TODO: read maintained category-center terms from the shared category model,
 * instead of growing per-page keyword lists.
 */
const RULES=Object.freeze([
  ["女袜",/女袜|女士.{0,8}袜|女性.{0,8}袜|レディース.{0,8}(ソックス|靴下)/i],
  ["男袜",/男袜|男士.{0,8}袜|男性.{0,8}袜|メンズ.{0,8}(ソックス|靴下)/i],
  ["童袜",/童袜|儿童.{0,8}袜|宝宝.{0,8}袜|キッズ.{0,8}(ソックス|靴下)/i],
  ["女帽",/女帽|女士.{0,8}帽|女性.{0,8}帽/i],
  ["男帽",/男帽|男士.{0,8}帽|男性.{0,8}帽/i],
  ["鞋靴",/拖鞋|棉拖|运动鞋|皮鞋|凉鞋|雪地靴|鞋子|クロッグ/i],
  ["宠物用品",/宠物|猫粮|狗粮|猫砂|猫抓板/i],
  ["电子配件",/数据线|充电器|充电线|手机壳|电脑配件/i],
  ["家居用品",/水龙头|防冻罩|家居|家具|收纳盒|浴室|厨房用品|灯串|串灯|灯饰|氛围灯|装饰灯|彩灯|圣诞灯|球灯/i],
  ["箱包",/背包|手提包|旅行包|钱包|行李箱/i],
  ["玩具用品",/玩具|玩偶|积木|娃娃/i]
]);

export function suggestProductCategory(name, allowedCategories=[]){
  const title=String(name||"").trim();
  if(!title)return "";
  const allowed=new Set(allowedCategories);
  const matches=RULES.filter(([category,pattern])=>allowed.has(category)&&pattern.test(title));
  return matches.length===1?matches[0][0]:"";
}
