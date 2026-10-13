// Read-only ItemAPI request contract; no credentials and no remote side effects.
export function itemGetPath(manageNumber){
 const value=String(manageNumber||"").trim();
 if(!/^[a-zA-Z0-9_-]{1,64}$/.test(value))throw new Error("invalid_manage_number");
 return "/es/2.0/items/manage-numbers/"+encodeURIComponent(value);
}
export function classifyGetStatus(status){
 if(status===200)return "found";
 if(status===404)return "absent";
 return "unknown";
}
