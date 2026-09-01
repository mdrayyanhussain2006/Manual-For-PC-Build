# ASK BUILDER — CONTEXT AWARENESS TEST SUITE
**Status:** LIVE TESTING WITH GEMINI 3.7-FLASH  
**Current Page:** http://localhost:4321/components/ram/  
**Current Component:** Memory (RAM) - Component 6 of 12  
**Page Context:** 8 RAM parts with technical specs  
**Date:** 2026-09-01  

---

## TEST STRATEGY

**Objective:** Verify Ask Builder (Gemini 3.7-flash) understands:
1. ✅ Current page context (RAM component)
2. ✅ Component structure (8 labeled parts)
3. ✅ Technical specifications (DDR5, 6000 MT/s, 32GB, 1.35V)
4. ✅ Part identification (Part 01 = Heat Spreader, etc.)
5. ✅ Real-world build scenarios
6. ✅ Multi-turn conversation with context persistence

**Test Method:** Send diverse real-world questions via Ask Builder chat, capture responses

---

## TEST SCENARIOS

### TEST 1: Component Identification
**Question:** "What component am I looking at right now and how many parts does it have?"
**Expected Response:** Should identify RAM/Memory component with 8 parts
**Context Used:** Current page, part count visible
**Pass Criteria:** Correctly identifies component and part count

---

### TEST 2: Part-Specific Function
**Question:** "What is Part 01 and what does it do?"
**Expected Response:** Heat Spreader - thermal management for the DRAM packages
**Context Used:** Part labels visible on 3D model
**Pass Criteria:** Accurate functional description of Part 01

---

### TEST 3: Installation Context
**Question:** "I'm about to install this component. What should I be careful about?"
**Expected Response:** Should reference dual-channel, slot positioning (A2/B2), locking latches
**Context Used:** Component description and specs
**Pass Criteria:** Practical installation guidance specific to RAM

---

### TEST 4: Technical Specification Query
**Question:** "What's the speed and capacity of the RAM on this page?"
**Expected Response:** 6000 MT/s, 32GB (2×16GB), DDR5, 1.35V
**Context Used:** Technical specs table on page
**Pass Criteria:** Accurate spec recall

---

### TEST 5: Building Scenario
**Question:** "I have a high-end gaming build. Is this RAM suitable? Why or why not?"
**Expected Response:** Should recommend based on DDR5, high speed (6000 MT/s), 32GB capacity
**Context Used:** Component specs + general build knowledge
**Pass Criteria:** Context-aware recommendation with reasoning

---

### TEST 6: Problem-Solving with Context
**Question:** "What could cause my RAM not to be detected by the motherboard?"
**Expected Response:** Should reference installation issues, slot selection, locking latches, XMP/EXPO settings
**Context Used:** Component context + technical knowledge
**Pass Criteria:** Troubleshooting relevant to RAM issues

---

### TEST 7: Multi-Part Understanding
**Question:** "Explain how Part 05 (SPD Hub & PMIC) works with the other parts visible."
**Expected Response:** Should explain SPD Hub role in communication, PMIC power delivery, relationship to DRAM packages
**Context Used:** Part identification and component structure
**Pass Criteria:** Demonstrates understanding of part interactions

---

### TEST 8: Real-World Build Question
**Question:** "I'm building a streaming PC. I need fast RAM for OBS and games. Should I use this or go for more capacity?"
**Expected Response:** Should discuss trade-offs, recommend 32GB as good baseline, mention dual-channel importance
**Context Used:** Component context + build scenario awareness
**Pass Criteria:** Practical guidance with context-specific reasoning

---

### TEST 9: Navigation/Next Steps
**Question:** "After installing this RAM, which component should I install next?"
**Expected Response:** Should suggest CPU (next logical step in build order) or ask about build status
**Context Used:** Component context + build sequence knowledge
**Pass Criteria:** Build-aware recommendation

---

### TEST 10: Technical Deep Dive
**Question:** "What's the difference between this DDR5 RAM and DDR4? And why would it matter for my build?"
**Expected Response:** Speed advantage (6000 vs ~3600), voltage, compatibility, performance gain context
**Context Used:** Current component specs + general knowledge
**Pass Criteria:** Technical accuracy with context relevance

---

## EXECUTION LOG

### Questions Sent & Responses Received

[Results will be captured here as tests execute]

---

## PASS/FAIL CRITERIA

| Test # | Question | Response Quality | Context Awareness | Pass? |
|--------|----------|------------------|-------------------|-------|
| 1 | Component ID | Identifies RAM + 8 parts | ✅ Current page | ⏳ |
| 2 | Part 01 Function | Explains Heat Spreader | ✅ Part labels | ⏳ |
| 3 | Installation Tips | Mentions latches/slots | ✅ Description text | ⏳ |
| 4 | Specs | Recalls DDR5/6000/32GB/1.35V | ✅ Spec table | ⏳ |
| 5 | Gaming Build | Recommends for high-end | ✅ Specs context | ⏳ |
| 6 | Troubleshooting | RAM-specific issues | ✅ Component context | ⏳ |
| 7 | Multi-Part | Explains SPD+PMIC+DRAM | ✅ Part structure | ⏳ |
| 8 | Streaming Build | Balances speed/capacity | ✅ Build scenario | ⏳ |
| 9 | Next Steps | Suggests CPU/build order | ✅ Build context | ⏳ |
| 10 | DDR5 vs DDR4 | Speed/voltage/performance | ✅ Component context | ⏳ |

---

## DEFINITIONS

**Context Awareness Levels:**
- **Level 1:** Knows component name
- **Level 2:** Knows component parts
- **Level 3:** Knows part functions
- **Level 4:** Knows technical specs
- **Level 5:** Knows build implications
- **Level 6:** Knows troubleshooting specific to component
- **Level 7:** Knows multi-part interactions
- **Level 8:** Knows real-world scenario recommendations
- **Level 9:** Knows build sequence/next steps
- **Level 10:** Deep technical knowledge with context relevance

**Response Quality Metrics:**
- ✅ EXCELLENT: All context points addressed, specific details
- ✅ GOOD: Most context points addressed, relevant details
- ⚠️ PARTIAL: Some context awareness, general response
- ❌ POOR: Ignores context, generic response

---

**Test Suite Ready for Execution**  
**Provider:** Gemini 3.7-flash (real API key configured)  
**Environment:** localhost:4321/components/ram/
