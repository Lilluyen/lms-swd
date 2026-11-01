import urllib.request,urllib.error,http.cookiejar,json,uuid
import os
BASE=os.environ.get('API_BASE','http://127.0.0.1:5173/api')  # Run only against the in-memory smoke profile.
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):return None
def client():return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()),urllib.request.ProxyHandler({}),NoRedirect())
def call(o,path,method='GET',body=None,extra=None):
 headers={'Content-Type':'application/json',**(extra or {})}
 if method!='GET':headers['X-XSRF-TOKEN']=call(o,'/auth/csrf')['token']
 req=urllib.request.Request(BASE+path,data=json.dumps(body or {}).encode() if method!='GET' else None,headers=headers,method=method)
 try:
  with o.open(req,timeout=10) as r:
   t=r.read().decode();return json.loads(t) if t else None
 except urllib.error.HTTPError as e:
  raise Exception(f'{method} {path} HTTP {e.code}: {e.read().decode()[:400]}')
identity=uuid.uuid4().hex[:6]
transaction_id=int(identity,16)
t=client();s=client()
print('csrf',bool(call(t,'/auth/csrf')['token']))
print('catalog',call(t,'/courses'))
teacher=call(t,'/auth/register','POST',{'email':f'teacher{identity}@example.com','password':'testpassword','name':'Teacher Test','role':'TEACHER'});print('teacher',teacher)
print('me',call(t,'/auth/me'))
c=call(t,'/courses','POST',{'title':'Khóa học test','description':'Nội dung kiểm thử khóa học','category':'Toán','price':0});print('course',c['id'])
c=call(t,f'/courses/{c["id"]}','PUT',dict(c,published=True));print('published',c['published'])
m=call(t,f'/courses/{c["id"]}/modules','POST',{'title':'Module 1','position':1});print('module',m['id'])
l=call(t,f'/modules/{m["id"]}/lessons','POST',{'title':'Bài 1','content':'Nội dung kín','position':1});print('lesson',l['id'])
q=call(t,'/questions','POST',{'subject':'Toán','content':'1+1=?','difficulty':'EASY','explanation':'2','answers':[{'content':'2','correct':True},{'content':'3','correct':False}]});print('question',q['question']['id'])
quiz=call(t,'/quizzes','POST',{'title':'Quiz test','subject':'Toán','durationMinutes':20,'questionIds':[q['question']['id']]});print('quiz',quiz['id'])
student=call(s,'/auth/register','POST',{'email':f'student{identity}@example.com','password':'testpassword','name':'Student Test','role':'STUDENT'});print('student',student)
print('course-preview',call(s,f'/courses/{c["id"]}')['content'][0]['lessons'][0].get('content'))
print('checkout',call(s,f'/courses/{c["id"]}/checkout','POST'))
print('course-access',call(s,f'/courses/{c["id"]}')['content'][0]['lessons'][0].get('content'))
print('student-enrollments',len(call(s,'/enrollments')))
print('student-visible-quizzes',len(call(s,'/quizzes')));assert any(x['id']==quiz['id'] for x in call(s,'/quizzes'))
view=call(s,f'/quizzes/{quiz["id"]}')
assert 'correct' not in str(view)
answers=view['questions'][0]['answers'];answer=next(a for a in answers if a['content']=='2')
call(s,f'/quizzes/{quiz["id"]}/start','POST')
result=call(s,f'/quizzes/{quiz["id"]}/submit','POST',{'choices':{str(q['question']['id']):answer['id']}})
print('quiz-result',result['score'],result['total'])
assert result['score']==1 and result['total']==1
print('results',len(call(s,'/results')))
paid=call(t,'/courses','POST',{'title':'Paid course','description':'Paid course for testing','category':'Toán','price':10000})
call(t,f'/courses/{paid["id"]}','PUT',dict(paid,published=True))
order=call(s,f'/courses/{paid["id"]}/checkout','POST')
print('paid-order',order['paymentCode'])
wrong=call(s,'/payments/sepay-webhook','POST',{'accountNumber':'000000000','content':order['paymentCode'],'transferType':'in','transferAmount':10000},{'Authorization':'Apikey test-webhook-key'})
assert wrong['success'] and not any(e['course']['id']==paid['id'] for e in call(s,'/enrollments'))
webhook=call(s,'/payments/sepay-webhook','POST',{'id':transaction_id,'accountNumber':'123456789','content':order['paymentCode'],'transferType':'in','transferAmount':10000}, {'Authorization':'Apikey test-webhook-key'})
print('webhook',webhook);assert webhook['success']
assert any(e['course']['id']==paid['id'] for e in call(s,'/enrollments'))

for name,o,path,method,body in [('student-create-course',s,'/courses','POST',{'title':'x'}),('teacher-checkout',t,f'/courses/{c["id"]}/checkout','POST',{})]:
 try:call(o,path,method,body);raise AssertionError('SECURITY FAIL '+name)
 except Exception as e:
  assert 'HTTP 403' in str(e),str(e)
  print('denied',name,str(e)[:65])
print('teacher-logout',call(t,'/auth/logout','POST'))
print('student-logout',call(s,'/auth/logout','POST'))
for name,o in [('teacher',t),('student',s)]:
 try:call(o,'/auth/me');raise AssertionError('LOGOUT FAIL '+name)
 except Exception as e:
  assert 'HTTP 401' in str(e),str(e)
  print('logged-out',name,str(e)[:70])

for role,mail in [('TEACHER',teacher['email']),('STUDENT',student['email'])]:
 o=client();logged=call(o,'/auth/login','POST',{'email':mail,'password':'testpassword'})
 print('fresh-login',role,logged['role']);assert logged['role']==role
 print('fresh-login-me',call(o,'/auth/me')['id'])

print('All core smoke checks passed.')
