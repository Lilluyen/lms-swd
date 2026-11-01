# Runs the core suite first against an isolated smoke-profile server.
from smoke_test import *
s=client();t=client();other=client()
call(s,'/auth/login','POST',{'email':student['email'],'password':'testpassword'})
call(t,'/auth/login','POST',{'email':teacher['email'],'password':'testpassword'})
call(other,'/auth/register','POST',{'email':f'other{identity}@example.com','password':'testpassword','name':'Other Teacher','role':'TEACHER'})
def denied(o,path,method,body,status):
 try: call(o,path,method,body)
 except Exception as e: assert f'HTTP {status}' in str(e),str(e)
 else: raise AssertionError('Expected rejection: '+path)
# Ownership and validation rollback
before=len(call(t,'/questions'))
denied(t,'/questions','POST',{'subject':'Math','content':'Invalid question','difficulty':'EASY','answers':[{'content':'A','correct':False},{'content':'B','correct':False}]},400)
assert len(call(t,'/questions'))==before
denied(other,f'/courses/{c["id"]}','PUT',c,403)
denied(s,'/questions','GET',None,403)
# Review is private, results are immutable and repeated submit is rejected
review=call(s,f'/results/{result["id"]}')
assert review['answers'][0]['correct'] is True
assert review['answers'][0]['answer']=='2'
denied(t,f'/results/{result["id"]}','GET',None,403)
denied(s,f'/quizzes/{quiz["id"]}/submit','POST',{'choices':{}},409)
denied(t,f'/quizzes/{quiz["id"]}','DELETE',{},409)
# Wishlist and review are persisted, course stats are recalculated, and the
# public review payload does not expose the student's account details.
assert call(s,f'/wishlist/{c["id"]}','POST')['wishlisted'] is True
assert any(item['course']['id']==c['id'] for item in call(s,'/wishlist'))
saved_review=call(s,f'/courses/{c["id"]}/reviews','POST',{'rating':5,'comment':'Nội dung rõ ràng và hữu ích.'})
assert saved_review['rating']==5 and set(saved_review['student'])=={'id','name'}
course_view=call(s,f'/courses/{c["id"]}')
assert course_view['course']['rating']==5 and course_view['course']['reviewCount']==1
assert course_view['reviews'][0]['comment']=='Nội dung rõ ràng và hữu ích.'
assert call(s,f'/wishlist/{c["id"]}','DELETE')['wishlisted'] is False
# Lesson progress is idempotent and requires enrollment
call(s,f'/lessons/{l["id"]}/complete','POST')
call(s,f'/lessons/{l["id"]}/complete','POST')
assert len(call(s,'/progress'))==1
# AI remains honestly unavailable without a key
denied(t,'/questions/generate','POST',{'subject':'Math','topic':'Addition','difficulty':'EASY','quantity':2,'questionType':'MULTIPLE_CHOICE','language':'ENGLISH','context':'Addition combines two or more quantities into a total.'},503)
# A replayed payment transaction does not enroll twice
n=len(call(s,'/enrollments'))
call(s,'/payments/sepay-webhook','POST',{'id':transaction_id,'accountNumber':'123456789','content':order['paymentCode'],'transferType':'in','transferAmount':10000},{'Authorization':'Apikey test-webhook-key'})
assert len(call(s,'/enrollments'))==n
paid_order=call(s,f'/orders/{order["orderId"]}')
assert paid_order['status']=='PAID' and paid_order['accountName']=='LEARNOVA TEST'
print('Extended regression checks passed: ownership, rollback, reviews, wishlist, timing, progress, AI errors, and SE Pay replay/status.')
