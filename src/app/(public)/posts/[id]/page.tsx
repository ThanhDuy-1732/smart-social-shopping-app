import { notFound } from 'next/navigation';
import { optionalActor } from '@/server/optional-actor';
import { getPost } from '@/modules/social/queries';
import { PostCard } from '@/components/post-card';
import { ActionForm } from '@/components/action-form';
import { socialAction,deletePostAction } from '../../feed/actions';
export const dynamic='force-dynamic';
export default async function Post({params}:{params:Promise<{id:string}>}){const actor=await optionalActor(),post=await getPost(actor,(await params).id);if(!post)notFound();return <div style={{maxWidth:800,margin:'auto'}}><PostCard post={post} signedIn={Boolean(actor)}/><section className="panel"><h2>Bình luận</h2>{post.comments.map(c=><article className="comment" key={c.id}><strong>{c.authorName}</strong><p>{c.text}</p></article>)}{!post.comments.length&&<p className="muted">Hãy bắt đầu cuộc trò chuyện.</p>}{actor&&<ActionForm action={socialAction} submitLabel="Gửi bình luận"><input type="hidden" name="type" value="comment"/><input type="hidden" name="targetId" value={post.id}/><label>Bình luận của bạn<textarea name="text" maxLength={2000} required/></label></ActionForm>}</section>{actor?.userId===post.authorId&&<details className="section"><summary>Quản lý bài của bạn</summary><ActionForm action={deletePostAction} submitLabel="Gỡ bài chia sẻ"><input type="hidden" name="postId" value={post.id}/></ActionForm></details>}</div>;}
