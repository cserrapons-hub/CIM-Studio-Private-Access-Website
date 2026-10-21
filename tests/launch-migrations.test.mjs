import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
test('new launch operations schemas are additive/repeat-safe and preserve previous rows in both stores',()=>{
 for(const careers of [false,true]){
  const db=new DatabaseSync(':memory:');
  try{
   const old=careers?['careers/0001_careers.sql','careers/0002_registrations.sql']:['0001_forms.sql','0003_getresponse_webhook.sql','0004_production_outbox.sql','0005_registrations.sql','0006_newsletter_consent.sql','0007_newsletter_html_deliveries.sql'];
   for(const name of old)db.exec(readFileSync('migrations/'+name,'utf8'));
   db.prepare('INSERT INTO form_rate_limits VALUES(?,?,?)').run('untouched-marker',3,9999999999999);
   const names=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name);
   const before=names.map(name=>({name,sql:db.prepare('SELECT sql FROM sqlite_master WHERE name=?').get(name).sql,rows:db.prepare('SELECT * FROM '+name).all()}));
   const next=readFileSync('migrations/'+(careers?'careers/0003_audit_seals.sql':'0008_launch_operations.sql'),'utf8');db.exec(next);db.exec(next);
   for(const original of before){assert.equal(db.prepare('SELECT sql FROM sqlite_master WHERE name=?').get(original.name).sql,original.sql);assert.deepEqual(db.prepare('SELECT * FROM '+original.name).all(),original.rows);}
   assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  }finally{db.close();}
 }
});
