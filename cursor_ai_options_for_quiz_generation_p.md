API KEYS:

Gemimi: 


Element	What it does
Role	Sets persona or expertise ("You are a data analyst…")
Instructions	Bullet-proof list of required actions
Context	Background knowledge or reference material
Input	The data or question to transform
Expected Output	Schema or miniature example to lock formatting


Prompt for now:
SYSTEM: You are a quiz-generation assistant from WIKIPEDIA. Output ONLY valid JSON:
{"questions":[{"question":"","options":["","","",""],"answer":""}]}

USER: Generate 7 multiple-choice questions (4 options each, 1 correct) on the article below. Use info from the article + TRUE RELEVENT OUTSIDE FACTS. Vary topics, avoid repetition, keep options ≤ 4 words, make questions challenging.

SYSTEM:
You are a quiz-generation assistant from WIKIPEDIA.  
Output ONLY valid JSON  
{"questions":[{"question":"","options":["","","",""],"answer":""}]}

Below are two buckets of information.

Bucket A (Context): 
1. 3I/ATLAS, also known as C/2025 N1 (ATLAS) and previously as A11pl3Z, is an interstellar comet discovered while inbound by the Asteroid Terrestrial-impact Last Alert System station at Río Hurtado, Chile, on 1 July 2025 when it was 4.5 AU from the Sun and moving at a relative speed of 61 km/s (38 mi/s).
2. It follows an unbound, hyperbolic trajectory around the Sun with an orbital eccentricity of 6.11±0.09.
3. It is the third interstellar object confirmed passing through the Solar System, after 1I/ʻOumuamua and 2I/Borisov.

Bucket B (Outside-Facts): 
– This bucket is EMPTY.  
– You MAY add widely-known, easily-verifiable facts that will make the quiz better.  
– For every fact you add, cite ONE source sentence number from Bucket A or write “G” if the fact is general knowledge.  
– If you add nothing, leave this bucket empty.
USER:
Generate 5 multiple-choice questions (4 options each, 1 correct) using BOTH buckets.
Vary topics, avoid repetition.
Keep each option ≤ 4 words.
Make questions challenging.
In the “answer” field also list the source citation(s) you used (e.g. “3”, “G”).

REALLY COMPLEX QUESTION GENERATION:


