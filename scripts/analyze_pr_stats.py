import json
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# Read JSONL file
data = []
with open("../scratch/pr-stats.jsonl", "r") as f:
    for line in f:
        data.append(json.loads(line))

# Convert to DataFrame
df = pd.DataFrame(data)
print(
    "PR close rate",
    df["state"].apply(lambda x: float(x == "closed")).mean(),
)

print(
    "PR accept rate",
    df["mergedAt"].apply(lambda x: float(x is not None)).mean(),
)

print(
    "PR deployment rate",
    df["isDeployed"].mean(),
)
# Convert time difference to hours for better readability
df["timeDiffHours"] = df["timeDiffMs"] / (1000 * 60 * 60)

# Create binary column for closed state
df["is_closed"] = (df["state"] == "closed").astype(int)

# Calculate correlation
correlation = df["timeDiffHours"].corr(df["is_closed"])

# Create subplots
fig = make_subplots(
    rows=1,
    cols=2,
    subplot_titles=(
        "Time to Last Commit Distribution by PR State",
        "PR State vs Time to Last Commit Scatter",
    ),
)

# Box plot
box = go.Box(
    y=df["timeDiffHours"], x=df["state"], name="Time Distribution", boxmean=True
)
fig.add_trace(box, row=1, col=1)

# Scatter plot
scatter = go.Scatter(
    x=df["timeDiffHours"],
    y=df["is_closed"],
    mode="markers",
    name="PR Status",
    marker=dict(size=8, opacity=0.6),
)
fig.add_trace(scatter, row=1, col=2)

# Update layout
fig.update_layout(
    title=f"PR Analysis (Correlation: {correlation:.3f})",
    showlegend=False,
    height=600,
    width=1200,
)

# Update y-axes labels
fig.update_yaxes(title_text="Hours", row=1, col=1)
fig.update_yaxes(title_text="Closed (1) / Open (0)", row=1, col=2)

# Update x-axes labels
fig.update_xaxes(title_text="PR State", row=1, col=1)
fig.update_xaxes(title_text="Hours to Last Commit", row=1, col=2)

# Save the plot
fig.write_html("../scratch/pr_analysis.html")

# Print summary statistics
print("\nSummary Statistics:")
print("==================")
print(f"Total PRs analyzed: {len(df)}")
print(f"Correlation between time and closure: {correlation:.3f}")
print("\nMean time to last commit (hours):")
print(df.groupby("state")["timeDiffHours"].mean())
print("\nMedian time to last commit (hours):")
print(df.groupby("state")["timeDiffHours"].median())


def format_time_diff(hours):
    days = int(hours // 24)
    remaining_hours = int(hours % 24)
    if days == 0:
        return f"{remaining_hours}h"
    return f"{days}d {remaining_hours}h"


# Calculate merge rate vs time
df["is_merged"] = df["mergedAt"].notna().astype(int)
df["time_bucket"] = pd.qcut(df["timeDiffHours"], q=10, duplicates="drop")
merge_rate_by_time = df.groupby("time_bucket")["is_merged"].mean().reset_index()
merge_rate_by_time["time_bucket_mid"] = merge_rate_by_time["time_bucket"].apply(
    lambda x: x.mid
)
merge_rate_by_time["time_formatted"] = merge_rate_by_time["time_bucket_mid"].apply(
    format_time_diff
)

# Create merge rate plot
merge_rate_fig = px.line(
    merge_rate_by_time,
    x="time_bucket_mid",
    y="is_merged",
    title="PR Merge Rate vs Time to Last Commit",
    labels={"time_bucket_mid": "Time to Last Commit", "is_merged": "Merge Rate"},
)
merge_rate_fig.update_traces(mode="lines+markers")

# Update x-axis ticks to show formatted time
merge_rate_fig.update_layout(
    xaxis=dict(
        tickmode="array",
        ticktext=merge_rate_by_time["time_formatted"],
        tickvals=merge_rate_by_time["time_bucket_mid"],
    )
)

merge_rate_fig.write_html("../scratch/merge_rate_analysis.html")

# Print merge rate statistics with formatted time
print("\nMerge Rate by Time Bucket:")
print("==========================")
for _, row in merge_rate_by_time.iterrows():
    print(
        f"Time: {format_time_diff(row['time_bucket_mid'])}, Merge rate: {row['is_merged']:.2f}"
    )
