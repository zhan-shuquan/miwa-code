/* ========================================
   AI Talent Registry｜AI人材ライブラリ
   AI人材カードは ai_talent_id だけを保持し、身分・能力・実績をここから取得する。
   将来はこのデータ層をデータベース/APIへ置き換え、カード本体は再設計しない。
======================================== */

export const aiTalents = {
  selection_ai: {
    id: 'selection_ai',
    name: '选品AI人才',
    type: '专业AI人才',
    responsibilityDomain: '选品',
    status: '培养中',
    coverageLabel: '流程覆盖级·待验证',
    coverageValue: null,
    coverageTotal: 5,
    version: 'V0.1',
    description: '负责选品责任域，通过真实业务持续验证并扩展能力；当前仅按5步选品主流程记录覆盖，测样作为按需验证能力另行调用。',
    avatar: {
      kind: 'icon',
      label: '选品AI人才'
    },
    flows: [
      {key:'opportunity',order:'01',name:'商品机会',executionCount:null,status:'待验证',independentRate:null,handoffRate:null,revisionRate:null,lastVerified:null},
      {key:'data',order:'02',name:'数据录入',executionCount:null,status:'待验证',independentRate:null,handoffRate:null,revisionRate:null,lastVerified:null},
      {key:'cost',order:'03',name:'成本试算',executionCount:null,status:'待验证',independentRate:null,handoffRate:null,revisionRate:null,lastVerified:null},
      {key:'pricing',order:'04',name:'智能定价',executionCount:null,status:'待验证',independentRate:null,handoffRate:null,revisionRate:null,lastVerified:null},
      {key:'decision',order:'05',name:'上架判断',executionCount:null,status:'待验证',independentRate:null,handoffRate:null,revisionRate:null,lastVerified:null}
    ],
    performance: {
      realOpportunities:null,
      independentRate:null,
      handoffRate:null,
      lastVerified:null
    }
  }
};

export function getAiTalent(aiTalentId){
  const talent = aiTalents[aiTalentId];
  if(!talent) return null;
  return typeof structuredClone === 'function' ? structuredClone(talent) : JSON.parse(JSON.stringify(talent));
}
