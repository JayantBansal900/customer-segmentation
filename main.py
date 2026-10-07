# Step 1: Libraries import karna
import pandas as pd
import datetime as dt
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt
import seaborn as sns

# Step 2: Dataset load karna
data = pd.read_excel("Online Retail.xlsx")

# Step 3: Dataset Cleaning
data = data.dropna(subset=['CustomerID'])
data = data[~data['InvoiceNo'].astype(str).str.startswith('C')]
data = data[(data['Quantity'] > 0) & (data['UnitPrice'] > 0)]
data = data.drop_duplicates()

# Step 4: RFM Feature Engineering
reference_date = data['InvoiceDate'].max() + dt.timedelta(days=1)

rfm = data.groupby('CustomerID').agg({
    'InvoiceDate': lambda x: (reference_date - x.max()).days,  # Recency
    'InvoiceNo': 'nunique',                                    # Frequency
    'Quantity': lambda x: (x * data.loc[x.index, 'UnitPrice']).sum()  # Monetary
})

rfm.columns = ['Recency', 'Frequency', 'Monetary']
rfm = rfm.reset_index()

# Step 5: Scaling
scaler = StandardScaler()
rfm_scaled = scaler.fit_transform(rfm[['Recency', 'Frequency', 'Monetary']])

# Step 6: KMeans Clustering
kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
rfm['Cluster'] = kmeans.fit_predict(rfm_scaled)

# Step 7: Cluster Summary
cluster_summary = rfm.groupby('Cluster').agg({
    'Recency': 'mean',
    'Frequency': 'mean',
    'Monetary': 'mean',
    'CustomerID': 'count'
}).rename(columns={'CustomerID': 'Num_Customers'})

print("\nCluster Summary:")
print(cluster_summary)

# Step 8: Visualization (Boxplots)
plt.figure(figsize=(15,5))
for i, col in enumerate(['Recency', 'Frequency', 'Monetary']):
    plt.subplot(1, 3, i+1)
    sns.boxplot(x='Cluster', y=col, data=rfm, palette='Set2')
    plt.title(f'{col} by Cluster')

plt.tight_layout()
plt.savefig("cluster_boxplots.png")   # save as image
plt.show()

# Step 9: Save Results
rfm.to_csv("customer_segmentation_results.csv", index=False)
cluster_summary.to_csv("cluster_summary.csv", index=True)
print("\nResults saved to 'customer_segmentation_results.csv' and 'cluster_summary.csv'")
