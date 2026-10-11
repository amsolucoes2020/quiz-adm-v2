export function messageStore(db) {
  return {
    get:async path=>(await db.doc(path).get()).data(),
    list:async(path,options={})=>{
      let query=db.collection(path);
      if(options.filter)query=query.where(options.filter.field,'==',options.filter.value);
      if(options.orderBy)query=query.orderBy(options.orderBy,options.direction||'asc');
      if(options.cursor) {
        if(typeof options.cursor!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(options.cursor))throw new Error('Página inválida.');
        const cursor=await db.doc(`${path}/${options.cursor}`).get();
        if(!cursor.exists)throw new Error('Página não encontrada.');
        query=query.startAfter(cursor);
      }
      const snapshot=await query.limit((options.limit||50)+1).get();
      const rows=snapshot.docs.slice(0,options.limit||50);
      return {items:rows.map(doc=>({id:doc.id,data:doc.data()})),cursor:snapshot.size>rows.length?rows.at(-1).id:null};
    },
    transaction:fn=>db.runTransaction(tx=>fn({get:async path=>(await tx.get(db.doc(path))).data(),set:(path,value)=>tx.set(db.doc(path),value)}))
  };
}
