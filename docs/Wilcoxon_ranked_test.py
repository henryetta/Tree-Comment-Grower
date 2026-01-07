import pandas as pd
from scipy.stats import wilcoxon

df = pd.read_csv("Post_study_report.csv")
df.columns = df.columns.str.strip().str.replace('"', '')

# -------------  section map  ------------- each section is aggregated as shown in the Survey Form
SEC = {
    "S1-Perception": [
        "I paid attention to the state of my tree (e.g., growth, health, water, poison) during the study.",
        "The tree visualization made my commenting behavior feel more visible to me over time.",
        "I understood that water drops represented positive or constructive comments, and poison drops represented harmful or negative comments.",
        "Seeing changes in my tree helped me notice patterns in how I usually comment online.",
    ],
    "S2-Distance": [
        "The tree made the effects of my comments feel more immediate than they usually do on social media.",
        "Watching my tree grow or decline made the consequences of my comments feel more concrete.",
        "The visualization helped reduce the feeling that my comments “disappear” after I post them.",
    ],
    "S3-Awareness": [
        "The water and poison feedback helped me recognize when a comment might be positive, neutral, or negative.",
        "During the study, I became more aware of the tone of my comments.",
        "The visualization made me think about how small comments can accumulate over time.",
        "The state of my tree influenced how I felt about my recent comments.",
    ],
    "S4-Behavioural": [
        "I sometimes wanted my tree to receive more water than poison.",
        "Any changes in my commenting felt self-motivated rather than forced.",
        "Even when I did not consciously think about the tree, its presence still affected how I commented.",
    ],
}

table = []
for sec, cols in SEC.items():
    # build one score per participant = mean of answer 
    scores = df[cols].apply(pd.to_numeric, errors='coerce').mean(axis=1, skipna=True).dropna()
    n  = scores.size
    md = scores.median()
    mn = scores.mean()
    sd = scores.std(ddof=1)          

    # one-sample Wilcoxon vs 3
    diffs = scores - 3
    diffs = diffs[diffs != 0]
    if diffs.size == 0:
        W, p = 0, 1.0
    else:
        stat, p = wilcoxon(diffs, zero_method='zsplit', alternative='two-sided', mode='exact')
        W = min(stat, diffs.size*(diffs.size+1)/2 - stat)

    table.append([sec, n, md, mn, sd, int(W), p])

out = pd.DataFrame(table, columns=['Section','n','Median','Mean','SD','Wilcoxon_W','p'])
print(out.to_string(index=False, float_format='%.3f'))
