/**
 * Fallback LinkedIn posts when Claude/AgentRouter is blocked (e.g. GitHub Actions).
 * English tech content — matches topics.js categories.
 */

const TEMPLATES = {
  programming: [
    `Most developers optimize for clever code. The best teams optimize for readable code.

I spent years chasing "elegant" abstractions until a senior engineer asked one question:

"Can a new hire understand this in 10 minutes?"

That changed how I review PRs forever.

Here's what actually makes code maintainable:
→ Names that explain intent, not implementation
→ Functions that do one thing
→ Tests that document behavior, not implementation details
→ Deleting code beats adding code

\`\`\`javascript
// Clever ❌
const r = u.filter(x => x.a).map(x => x.n).reduce((a, b) => a + b, 0);

// Clear ✅
const activeUsers = users.filter(user => user.isActive);
const totalNames = activeUsers.map(user => user.name).join(', ');
\`\`\`

**Takeaway:** Optimize for the next reader — it's usually you at 2 AM during an incident.

What's one "clever" pattern you replaced with something simpler?

#programming #softwareengineering #cleancode #coding #tech`,
  ],
  career: [
    `The interview question that reveals a company's real culture:

"Walk me through your last production incident — who was involved and what changed after?"

Not their tech stack. Not LeetCode scores. How they handle failure.

**Red flags:**
- Blame on individuals
- No postmortems
- "We don't really have incidents" (they do)

**Green flags:**
- Blameless reviews
- Clear on-call rotation
- Concrete process improvements after outages

**Takeaway:** Ask about incidents in your next interview. The second answer matters more than the first.

What's your go-to culture-revealing interview question?

#career #tech #softwareengineering #interviews #programming`,
  ],
  ai: [
    `Stop treating AI as a magic autocomplete. Start treating it as a junior pair programmer.

The developers getting 10x value from LLMs share three habits:

1. **They write the spec first** — context beats clever prompts
2. **They verify everything** — hallucinations are guaranteed at scale
3. **They automate the boring parts** — tests, boilerplate, docs

AI won't replace engineers who think in systems.
It will replace engineers who refuse to adapt their workflow.

**Takeaway:** Use AI to compress repetitive work, not to skip understanding.

How are you integrating LLMs into your daily dev workflow?

#AI #programming #softwareengineering #tech #coding`,
  ],
  learning: [
    `You don't need 50 courses. You need one project and a feedback loop.

The learning roadmap that actually works:

**Month 1–2:** Build something small end-to-end (even ugly)
**Month 3–4:** Read one book deeply, apply one concept per week
**Month 5–6:** Contribute to open source or ship a side project publicly

Tutorials give you false confidence.
Shipping gives you real skills.

Free resources that punch above their weight:
→ Official docs (underrated)
→ One structured course, finished completely
→ Public commits — accountability is free

**Takeaway:** Replace "what should I learn next?" with "what can I ship this week?"

What's the one project that leveled you up the most?

#programming #learning #tech #softwareengineering #coding`,
  ],
  productivity: [
    `Your IDE setup isn't the bottleneck. Your context switching is.

I tracked my week once:
→ 47 Slack interruptions
→ 12 "quick questions" that weren't quick
→ 3 hours of actual deep work

The fix wasn't a new tool. It was boundaries:

\`\`\`
Deep work block:  9:00 – 11:30  (notifications off)
Review block:     2:00 – 3:00   (PRs + messages)
Admin block:      4:30 – 5:00   (meetings prep)
\`\`\`

**Takeaway:** Protect 2 hours of uninterrupted focus daily — output compounds faster than any plugin.

What's one habit that doubled your productivity?

#productivity #programming #developer #tech #softwareengineering`,
  ],
  opensource: [
    `Your side project doesn't need users on day one. It needs one commit on day one.

Shipping in public changed my career more than any certification:

→ Recruiters found me through GitHub, not job boards
→ I learned faster by explaining code in READMEs
→ Small OSS contributions opened doors to bigger teams

Start embarrassingly small:
1. README with the problem you're solving
2. MVP in a weekend (scope ruthlessly)
3. One tweet/post when you ship v0.1

Perfect is the enemy of shipped.

**Takeaway:** Publish before you feel ready — momentum beats motivation.

What side project are you building (or avoiding)?

#opensource #programming #softwareengineering #sideproject #tech`,
  ],
  industry: [
    `Remote work didn't fail. Bad management adapted to offices, not outcomes.

Three years in, the data is clear:
→ Async-first teams ship consistently
→ Output-based reviews retain top talent
→ "Camera on" culture correlates with burnout, not performance

The companies winning the talent war in 2026:
✅ Document decisions in writing
✅ Measure impact, not hours online
✅ Hire globally, pay fairly

**Takeaway:** If your team's "culture" requires physical presence, it's not culture — it's control.

What's the most outdated workplace policy you've seen?

#tech #remotework #career #softwareengineering #programming`,
  ],
};

export function generateFromTemplate(topicSelection, date = new Date()) {
  const variants = TEMPLATES[topicSelection.topic.id] || TEMPLATES.programming;
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - startOfYear) / (1000 * 60 * 60 * 24));
  const index = dayOfYear % variants.length;
  return variants[index];
}

export function shouldUseTemplateOnly() {
  if (process.env.FORCE_TEMPLATE_POSTS === 'true') return true;
  if (process.env.GITHUB_ACTIONS === 'true') return true;
  return false;
}
