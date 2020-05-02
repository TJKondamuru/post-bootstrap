const Cache = {}

export function AddCacheEntry(callfirst, entryindex){
    if(!Cache[entryindex]){
        Cache[entryindex] = new Promise((res, rej)=>{
            const preop = callfirst();
            preop.then(preopres=>res(preopres))
            .catch(err=>rej(err));
        })
    }
    return Cache[entryindex];
}
export function RemoveCacheEntry(entryindex){
    delete Cache[entryindex];
}
