// Demo reviews → Firestore, so the review read path has data to render (there
// are genuinely 0 real reviews yet). Each doc is marked { sample: true } so it
// can be cleaned later. Recomputes each subject's rating aggregate after.
// Run: pnpm --filter @repo/db seed:reviews   (needs the .firebase-admin-key.json)
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const keyPath = fileURLToPath(new URL('../../../.firebase-admin-key.json', import.meta.url))
const app = initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) })
const fs = getFirestore(app)

type Sample = {
	subjectId: string
	rating: number
	review: string
	nick: string
	year: number
	term: number
	daysAgo: number
	likes: number
}
const SAMPLES: Sample[] = [
	{
		subjectId: '01006012',
		rating: 5,
		nick: 'พี่โค้ดดิ้ง',
		year: 2566,
		term: 1,
		daysAgo: 20,
		likes: 12,
		review:
			'ปูพื้นฐานเขียนโปรแกรมตั้งแต่ศูนย์ อาจารย์อธิบายทีละสเต็ป งาน lab เยอะแต่ทำแล้วเข้าใจจริง ใครไม่เคยเขียนโค้ดมาก่อนก็ตามทัน',
	},
	{
		subjectId: '01006012',
		rating: 4,
		nick: 'รุ่นพี่ CE',
		year: 2566,
		term: 1,
		daysAgo: 55,
		likes: 7,
		review: 'เนื้อหาแน่น สอบ midterm ออกตรงที่สอนในคาบ เก็บคะแนน lab ทุกสัปดาห์ ถ้าไม่ดองงานก็สบาย',
	},
	{
		subjectId: '01006012',
		rating: 3,
		nick: 'นักศึกษาวิศวะ',
		year: 2565,
		term: 2,
		daysAgo: 130,
		likes: 3,
		review: 'งานเยอะไปนิดสำหรับวิชา 3 หน่วยกิต แต่ถ้าตั้งใจทำส่งตรงเวลาเกรดก็ออกมาดี',
	},
	{
		subjectId: '01006001',
		rating: 5,
		nick: 'พี่แคล',
		year: 2566,
		term: 1,
		daysAgo: 15,
		likes: 18,
		review: 'แคลคูลัสวิศวะเนื้อหาเยอะแต่อาจารย์อธิบายเข้าใจง่าย ฝึกโจทย์ท้ายบทเยอะ ๆ แล้วจะรอดข้อสอบ',
	},
	{
		subjectId: '01006001',
		rating: 4,
		nick: 'รุ่นพี่ปี 2',
		year: 2565,
		term: 1,
		daysAgo: 210,
		likes: 9,
		review: 'ต้องทบทวนทุกสัปดาห์ไม่งั้นตามไม่ทัน ข้อสอบไม่ยากถ้าทำโจทย์มาเยอะ คุมเวลาในห้องสอบดี ๆ',
	},
]

async function main() {
	const now = 1_749_000_000_000 // fixed base ms (stable doc ids across re-runs)
	const day = 86_400_000
	for (const [i, s] of SAMPLES.entries()) {
		const subj = await fs.collection('subjects').doc(s.subjectId).get()
		const subjectNameTh = subj.exists ? ((subj.data()?.nameTh as string) ?? null) : null
		const id = now + i
		const reviewRef = fs.collection('reviews').doc(String(id))
		await reviewRef.set({
			id,
			subjectId: s.subjectId,
			subjectNameTh,
			authorUid: `sample-${i}`,
			authorNickname: s.nick,
			authorName: s.nick,
			rating: s.rating,
			review: s.review,
			likeCount: s.likes,
			createdAt: Timestamp.fromMillis(now - s.daysAgo * day),
			year: s.year,
			term: s.term,
			sample: true,
		})
		// Back likeCount with real like docs so toggleLike (which recomputes from
		// the likes subcollection) stays consistent — a first like becomes likes+1,
		// not a reset. Deterministic ids → idempotent across re-runs.
		const batch = fs.batch()
		for (let k = 0; k < s.likes; k++) {
			batch.set(reviewRef.collection('likes').doc(`seed-liker-${i}-${k}`), {
				createdAt: Timestamp.fromMillis(now - s.daysAgo * day),
				sample: true,
			})
		}
		await batch.commit()
		console.log(`+ ${s.subjectId} ${s.rating}★ "${s.nick}" (${s.likes} likes)`)
	}
	for (const subjectId of [...new Set(SAMPLES.map((s) => s.subjectId))]) {
		const snap = await fs.collection('reviews').where('subjectId', '==', subjectId).get()
		const ratings = snap.docs.map((d) => d.data().rating as number)
		const reviewCount = ratings.length
		const ratingAvg = reviewCount ? ratings.reduce((a, b) => a + b, 0) / reviewCount : 0
		await fs.collection('subjects').doc(subjectId).update({ ratingAvg, reviewCount })
		console.log(`= ${subjectId}: ${ratingAvg.toFixed(2)}★ (${reviewCount})`)
	}
	console.log('done')
}
main().then(() => process.exit(0))
