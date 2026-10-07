import streamlit as st
import pandas as pd
import datetime as dt
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.decomposition import PCA
import plotly.express as px
from io import BytesIO

# ----------------- Page Config -----------------
st.set_page_config(page_title="Customer Segmentation Dashboard", layout="wide")

# ----------------- CSS / Header & Footer -----------------
st.markdown("""
<style>
body {background-color: #0e1117; color: #fafafa; font-family:sans-serif;}
h1,h2,h3,h4,h5 {color:#1f77b4;}
.stButton>button {background-color:#1f77b4;color:white;border-radius:10px;height:3em;width:100%;font-size:16px;font-weight:bold;}
header{background-color:#1f77b4;padding:20px;text-align:center;color:white;font-size:26px;font-weight:bold;border-radius:10px;}
footer{background-color:#1f77b4;color:white;padding:10px;text-align:center;border-radius:5px;margin-top:20px;}
.card {background-color:#161d29; padding:15px; border-radius:10px; margin:10px;}
</style>
<header>🚀 Customer Segmentation Dashboard</header>
""", unsafe_allow_html=True)

# ----------------- Intro Section -----------------
st.markdown("""
<div class='card'>
<h3>Welcome!</h3>
<p>This dashboard segments customers based on <b>Recency, Frequency, and Monetary</b> values using <b>KMeans clustering</b>.</p>
<p>Explore clusters, visualize PCA, analyze metrics, and download results. Use the sidebar to adjust settings and run segmentation.</p>
</div>
""", unsafe_allow_html=True)

# ----------------- Sidebar -----------------
st.sidebar.header("Settings")
use_example = st.sidebar.checkbox("Use Example Dataset", True)
uploaded_file = st.sidebar.file_uploader("Upload CSV/XLSX", type=["csv","xlsx"])
cluster_range = st.sidebar.slider("Elbow Method Cluster Range", 2, 10, (2,6))
num_clusters = st.sidebar.number_input("Final Number of Clusters", min_value=2, max_value=10, value=4)
show_boxplots = st.sidebar.checkbox("Show Boxplots", True)
show_pca = st.sidebar.checkbox("Show PCA Scatter", True)
run_button = st.sidebar.button("Run Segmentation")

# ----------------- Load Data -----------------
def load_example():
    try:
        df = pd.read_excel("Online Retail.xlsx")
    except:
        df = pd.DataFrame({
            "InvoiceNo":["1001","1001","1002","1003","1004"],
            "StockCode":["A","B","C","A","D"],
            "Description":["prod A","prod B","prod C","prod A","prod D"],
            "Quantity":[2,3,1,5,2],
            "InvoiceDate":pd.to_datetime(["2020-01-01","2020-01-01","2020-01-02","2020-01-03","2020-01-04"]),
            "UnitPrice":[10,15,7,10,20],
            "CustomerID":[1001,1001,1002,1003,1004],
            "Country":["UK","UK","UK","UK","UK"]
        })
    return df

def read_upload(uploaded):
    if uploaded is None:
        return None
    try:
        if uploaded.type=="text/csv" or str(uploaded.name).endswith(".csv"):
            return pd.read_csv(uploaded)
        else:
            return pd.read_excel(uploaded)
    except Exception as e:
        st.error(f"Error reading file: {e}")
        return None

# ----------------- Data Cleaning -----------------
def clean_data(df):
    df = df.dropna(subset=['CustomerID'])
    df = df[~df['InvoiceNo'].astype(str).str.startswith('C', na=False)]
    df = df[(df['Quantity']>0) & (df['UnitPrice']>0)]
    df = df.drop_duplicates()
    return df

def compute_rfm(df):
    ref = df['InvoiceDate'].max() + dt.timedelta(days=1)
    rfm = df.groupby('CustomerID').agg({
        'InvoiceDate': lambda x: (ref - x.max()).days,
        'InvoiceNo': 'nunique',
        'Quantity': lambda x: (x * df.loc[x.index,'UnitPrice']).sum()
    })
    rfm.columns = ['Recency','Frequency','Monetary']
    rfm = rfm.reset_index()
    return rfm

# ----------------- Clustering & PCA -----------------
def scale_and_cluster(rfm_df, k):
    scaler = StandardScaler()
    X = scaler.fit_transform(rfm_df[['Recency','Frequency','Monetary']])
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X)
    rfm_df['Cluster'] = labels
    pca = PCA(n_components=2)
    coords = pca.fit_transform(X)
    rfm_df['PCA1'] = coords[:,0]
    rfm_df['PCA2'] = coords[:,1]
    return rfm_df, scaler, kmeans

# ----------------- Plotly Charts -----------------
def plot_elbow_silhouette(X, cluster_range):
    import plotly.graph_objects as go
    distortions = []
    silhouettes = []
    K = list(range(cluster_range[0], cluster_range[1]+1))
    for k in K:
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(X)
        distortions.append(kmeans.inertia_)
        silhouettes.append(silhouette_score(X, labels))
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=K, y=distortions, mode='lines+markers', name='Inertia'))
    fig.add_trace(go.Scatter(x=K, y=silhouettes, mode='lines+markers', name='Silhouette Score', yaxis="y2"))
    fig.update_layout(
        title="Elbow & Silhouette",
        xaxis_title="Number of clusters",
        yaxis_title="Inertia",
        yaxis=dict(title="Inertia"),
        yaxis2=dict(title="Silhouette Score", overlaying="y", side="right")
    )
    st.plotly_chart(fig, use_container_width=True)

def plot_boxplots(rfm_df):
    fig = px.box(rfm_df, x='Cluster', y='Recency', color='Cluster', title='Recency by Cluster')
    st.plotly_chart(fig, use_container_width=True)
    fig = px.box(rfm_df, x='Cluster', y='Frequency', color='Cluster', title='Frequency by Cluster')
    st.plotly_chart(fig, use_container_width=True)
    fig = px.box(rfm_df, x='Cluster', y='Monetary', color='Cluster', title='Monetary by Cluster')
    st.plotly_chart(fig, use_container_width=True)

def plot_pca_scatter(rfm_df):
    fig = px.scatter(rfm_df, x='PCA1', y='PCA2', color='Cluster',
                     hover_data=['CustomerID','Recency','Frequency','Monetary'], title="PCA 2D Scatter Plot")
    st.plotly_chart(fig, use_container_width=True)

# ----------------- CSV Download -----------------
def download_csv(df):
    output = BytesIO()
    df.to_csv(output, index=False)
    return output

# ----------------- Load Data -----------------
if use_example:
    data = load_example()
elif uploaded_file is not None:
    data = read_upload(uploaded_file)
else:
    st.warning("Upload a dataset or use example dataset")
    st.stop()

st.subheader("Sample Data")
st.dataframe(data.head())

# ----------------- Run Segmentation -----------------
if run_button:
    st.info("Running segmentation pipeline...")
    df_clean = clean_data(data)
    rfm = compute_rfm(df_clean)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(rfm[['Recency','Frequency','Monetary']])

    # Elbow + Silhouette
    st.subheader("📈 Elbow & Silhouette")
    plot_elbow_silhouette(X_scaled, cluster_range)

    # Final clustering
    rfm_clustered, scaler, kmeans = scale_and_cluster(rfm, num_clusters)

    # Cluster summary
    st.subheader("📊 Cluster Summary")
    cluster_summary = rfm_clustered.groupby('Cluster').agg({
        'Recency':'mean','Frequency':'mean','Monetary':'mean','CustomerID':'count'
    }).rename(columns={'CustomerID':'Num_Customers'})
    st.dataframe(cluster_summary)

    # Metrics Cards
    st.subheader("📌 Cluster Metrics")
    cols = st.columns(len(rfm_clustered['Cluster'].unique()))
    for i,c in enumerate(rfm_clustered['Cluster'].unique()):
        cols[i].metric(f"Cluster {c} Avg Recency", f"{cluster_summary.loc[c,'Recency']:.1f}")
        cols[i].metric(f"Cluster {c} Avg Frequency", f"{cluster_summary.loc[c,'Frequency']:.1f}")
        cols[i].metric(f"Cluster {c} Avg Monetary", f"${cluster_summary.loc[c,'Monetary']:.2f}")

    # Boxplots
    if show_boxplots:
        st.subheader("📦 Cluster Boxplots")
        with st.expander("View Boxplots"):
            plot_boxplots(rfm_clustered)

    # PCA scatter
    if show_pca:
        st.subheader("🌐 PCA Scatter Plot")
        with st.expander("View PCA Scatter"):
            plot_pca_scatter(rfm_clustered)

    # Download CSV
    st.subheader("⬇️ Download CSV")
    csv_bytes = download_csv(rfm_clustered)
    st.download_button("Download CSV", data=csv_bytes.getvalue(), file_name="customer_segmentation_results.csv", mime="text/csv")

    st.success("✅ Segmentation Completed!")

# ----------------- Footer -----------------
st.markdown("""
<footer>
Made with ❤️ by JAYANT | Python, Streamlit, ML
</footer>
""", unsafe_allow_html=True)
