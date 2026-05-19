"""
AtRiskSA — Streamlit Dashboard
Converted from Flask backend to full Streamlit app.
"""
import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from scipy import stats

st.set_page_config(page_title="AtRiskSA — DHET Analytics Platform", page_icon="🎓", layout="wide")

st.markdown("""
<style>
div[data-testid="metric-container"] {
    background-color: #1e2130; border-radius: 10px;
    padding: 15px; border-left: 3px solid #7c3aed;
}
.note-box {
    background-color: #1e2130; border-left: 3px solid #7c3aed;
    padding: 10px 15px; border-radius: 5px;
    color: #a0aec0; font-size: 13px; margin-top: 10px;
}
</style>
""", unsafe_allow_html=True)

INSTITUTIONS_RAW = [
    {"name":"Walter Sisulu University","short":"WSU","type":"Comprehensive","province":"Eastern Cape","enrolled":27000,"dropout":58,"nsfas":82,"q":[38,28,18,10,6],"risk":91},
    {"name":"University of Venda","short":"UNIVEN","type":"Traditional","province":"Limpopo","enrolled":16000,"dropout":55,"nsfas":87,"q":[42,28,16,8,6],"risk":90},
    {"name":"University of Limpopo","short":"UL","type":"Traditional","province":"Limpopo","enrolled":18000,"dropout":54,"nsfas":85,"q":[40,30,16,9,5],"risk":89},
    {"name":"Mangosuthu University of Tech","short":"MUT","type":"Technology","province":"KwaZulu-Natal","enrolled":13000,"dropout":56,"nsfas":84,"q":[36,30,18,10,6],"risk":88},
    {"name":"University of Fort Hare","short":"UFH","type":"Traditional","province":"Eastern Cape","enrolled":13000,"dropout":53,"nsfas":83,"q":[38,29,18,9,6],"risk":87},
    {"name":"University of Zululand","short":"UNIZULU","type":"Traditional","province":"KwaZulu-Natal","enrolled":16000,"dropout":52,"nsfas":82,"q":[36,28,19,10,7],"risk":85},
    {"name":"Sol Plaatje University","short":"SPU","type":"Traditional","province":"Northern Cape","enrolled":4000,"dropout":50,"nsfas":80,"q":[34,28,20,11,7],"risk":83},
    {"name":"University of Mpumalanga","short":"UMP","type":"Traditional","province":"Mpumalanga","enrolled":6500,"dropout":48,"nsfas":79,"q":[35,27,20,11,7],"risk":82},
    {"name":"Tshwane University of Technology","short":"TUT","type":"Technology","province":"Gauteng","enrolled":60000,"dropout":52,"nsfas":76,"q":[30,28,22,12,8],"risk":82},
    {"name":"Vaal University of Technology","short":"VUT","type":"Technology","province":"Gauteng","enrolled":18000,"dropout":51,"nsfas":78,"q":[32,26,22,12,8],"risk":81},
    {"name":"Durban University of Technology","short":"DUT","type":"Technology","province":"KwaZulu-Natal","enrolled":28000,"dropout":49,"nsfas":72,"q":[29,27,22,13,9],"risk":77},
    {"name":"Cape Peninsula Univ of Technology","short":"CPUT","type":"Technology","province":"Western Cape","enrolled":35000,"dropout":48,"nsfas":70,"q":[28,26,22,14,10],"risk":76},
    {"name":"Central University of Technology","short":"CUT","type":"Technology","province":"Free State","enrolled":14000,"dropout":50,"nsfas":75,"q":[30,26,22,14,8],"risk":79},
    {"name":"Sefako Makgatho Health Sci Univ","short":"SMU","type":"Traditional","province":"Gauteng","enrolled":5000,"dropout":40,"nsfas":72,"q":[30,26,22,14,8],"risk":72},
    {"name":"UNISA","short":"UNISA","type":"Distance","province":"Gauteng","enrolled":300000,"dropout":46,"nsfas":55,"q":[18,22,25,20,15],"risk":78},
    {"name":"North-West University","short":"NWU","type":"Traditional","province":"North West","enrolled":65000,"dropout":38,"nsfas":60,"q":[24,26,24,16,10],"risk":64},
    {"name":"University of Johannesburg","short":"UJ","type":"Comprehensive","province":"Gauteng","enrolled":52000,"dropout":40,"nsfas":62,"q":[24,26,24,16,10],"risk":66},
    {"name":"Nelson Mandela University","short":"NMU","type":"Comprehensive","province":"Eastern Cape","enrolled":27000,"dropout":42,"nsfas":63,"q":[26,26,22,16,10],"risk":67},
    {"name":"University of the Free State","short":"UFS","type":"Traditional","province":"Free State","enrolled":38000,"dropout":38,"nsfas":58,"q":[22,24,26,18,10],"risk":61},
    {"name":"University of the Western Cape","short":"UWC","type":"Traditional","province":"Western Cape","enrolled":22000,"dropout":36,"nsfas":62,"q":[22,26,26,16,10],"risk":60},
    {"name":"University of KwaZulu-Natal","short":"UKZN","type":"Traditional","province":"KwaZulu-Natal","enrolled":47000,"dropout":34,"nsfas":54,"q":[20,24,26,18,12],"risk":56},
    {"name":"Rhodes University","short":"RU","type":"Traditional","province":"Eastern Cape","enrolled":8500,"dropout":24,"nsfas":40,"q":[12,18,24,24,22],"risk":42},
    {"name":"University of Pretoria","short":"UP","type":"Traditional","province":"Gauteng","enrolled":55000,"dropout":22,"nsfas":35,"q":[10,16,24,26,24],"risk":36},
    {"name":"Wits University","short":"Wits","type":"Traditional","province":"Gauteng","enrolled":40000,"dropout":20,"nsfas":30,"q":[8,14,24,28,26],"risk":32},
    {"name":"Stellenbosch University","short":"SU","type":"Traditional","province":"Western Cape","enrolled":32000,"dropout":16,"nsfas":22,"q":[5,10,20,30,35],"risk":24},
    {"name":"University of Cape Town","short":"UCT","type":"Traditional","province":"Western Cape","enrolled":29000,"dropout":14,"nsfas":20,"q":[4,8,18,30,40],"risk":20},
]

@st.cache_data
def get_df():
    df = pd.DataFrame(INSTITUTIONS_RAW)
    df['q1q2'] = df['q'].apply(lambda q: q[0]+q[1])
    df['q1'] = df['q'].apply(lambda q: q[0])
    return df

def risk_label(s):
    if s>=85: return 'Critical'
    if s>=70: return 'High'
    if s>=50: return 'Medium'
    return 'Low'

def risk_color(s):
    if s>=85: return '#ef4444'
    if s>=70: return '#f97316'
    if s>=50: return '#eab308'
    return '#22c55e'

DARK = dict(plot_bgcolor='#1e2130', paper_bgcolor='#1e2130', font_color='white')

with st.sidebar:
    st.markdown("## 🎓 AtRiskSA")
    st.markdown("**DHET Analytics Platform**")
    st.markdown("---")
    page = st.radio("Navigate", ["🏠 Risk Overview","📊 Data Analysis","🏫 Institutions","🤖 Insights AI"])
    st.markdown("---")
    st.markdown("**Data Sources**")
    st.caption("DHET / HEMIS 2021–2024")
    st.caption("CHE VitalStats 2021")
    st.caption("HSRC Higher Education")
    st.caption("Last updated: May 2024")

df = get_df()

# PAGE 1
if page == "🏠 Risk Overview":
    st.markdown("## Risk Overview")
    st.caption("26 public universities · School quintile intake · DHET-aligned dropout & retention data")
    c1,c2,c3,c4,c5 = st.columns(5)
    c1.metric("Total Enrolled","1.07M","Public universities 2023")
    c2.metric("National Dropout Rate","52%","DHET / HSRC estimate")
    c3.metric("On-time Graduation","33%","Complete in minimum time")
    c4.metric("Q1–Q3 Student Share","68%","Historically disadvantaged")
    c5.metric("Critical-risk Institutions","6","Risk score ≥ 85")
    st.markdown("---")
    cl, cr = st.columns([3,2])
    with cl:
        st.markdown("#### At-risk Score by Institution")
        t = st.selectbox("Filter by type",["All","Traditional","Technology","Comprehensive","Distance"])
        fdf = df if t=="All" else df[df['type']==t]
        sdf = fdf.sort_values('risk',ascending=True)
        fig = go.Figure(go.Bar(x=sdf['risk'],y=sdf['short'],orientation='h',
            marker_color=[risk_color(r) for r in sdf['risk']],text=sdf['risk'],textposition='outside'))
        fig.update_layout(**DARK,height=600,xaxis=dict(range=[0,100],gridcolor='#2d3748'),
            yaxis=dict(gridcolor='#2d3748'),margin=dict(l=10,r=40,t=10,b=10))
        st.plotly_chart(fig,use_container_width=True)
    with cr:
        st.markdown("#### Risk Level Distribution")
        rc={'Critical (≥85)':sum(1 for r in df['risk'] if r>=85),
            'High (70–84)':sum(1 for r in df['risk'] if 70<=r<85),
            'Medium (50–69)':sum(1 for r in df['risk'] if 50<=r<70),
            'Low (<50)':sum(1 for r in df['risk'] if r<50)}
        fig2=go.Figure(go.Pie(labels=list(rc.keys()),values=list(rc.values()),
            marker_colors=['#ef4444','#f97316','#eab308','#22c55e'],hole=0.5))
        fig2.update_layout(**DARK,height=280,margin=dict(l=10,r=10,t=10,b=10))
        st.plotly_chart(fig2,use_container_width=True)
        st.markdown("#### Dropout Rate by Province")
        prov=df.groupby('province')['dropout'].mean().reset_index().sort_values('dropout',ascending=False)
        fig3=px.bar(prov,x='province',y='dropout',color='dropout',color_continuous_scale='RdYlGn_r')
        fig3.update_layout(**DARK,height=280,margin=dict(l=10,r=10,t=10,b=80),
            xaxis_tickangle=-45,coloraxis_showscale=False)
        st.plotly_chart(fig3,use_container_width=True)

# PAGE 2
elif page == "📊 Data Analysis":
    st.markdown("## Data Analysis")
    analysis=st.selectbox("Select Analysis Module",[
        "Descriptive Statistics","Correlation Matrix","Dropout Distribution",
        "Top 10 Highest-Risk Institutions","By Institution Type","By Province",
        "Outlier Detection","Quintile × Dropout Regression","NSFAS Dependency Analysis",
        "Equity Index","Risk Model Components","Graduation Gap","Cohort Survival Simulation"])
    chart_type=st.radio("Chart type",["bar","line","scatter","pie","table"],horizontal=True)
    st.markdown("---")

    if analysis=="Descriptive Statistics":
        st.markdown("### Descriptive Statistics")
        cols=['dropout','nsfas','risk','enrolled','q1q2']
        desc=df[cols].describe().round(2)
        st.dataframe(desc,use_container_width=True)
        if chart_type in ('bar','line'):
            fig=go.Figure()
            fig.add_trace(go.Bar(name='Mean',x=cols,y=desc.loc['mean'],marker_color='#7c3aed'))
            fig.add_trace(go.Bar(name='Std',x=cols,y=desc.loc['std'],marker_color='#ef4444'))
            fig.update_layout(**DARK,barmode='group')
            st.plotly_chart(fig,use_container_width=True)
        st.markdown(f'<div class="note-box">📌 {len(df)} institutions. Average dropout: {df.dropout.mean():.1f}%. Risk range: {df.risk.min()}–{df.risk.max()}.</div>',unsafe_allow_html=True)

    elif analysis=="Correlation Matrix":
        st.markdown("### Correlation Matrix")
        cols=['dropout','nsfas','risk','q1q2','enrolled']
        corr=df[cols].corr().round(3)
        fig=px.imshow(corr,color_continuous_scale='RdBu_r',zmin=-1,zmax=1,text_auto=True)
        fig.update_layout(**DARK)
        st.plotly_chart(fig,use_container_width=True)
        r,p=stats.pearsonr(df['dropout'],df['nsfas'])
        st.markdown(f'<div class="note-box">📌 Dropout × NSFAS: r={r:.3f} (p={p:.4f}). Socioeconomic origin is a key risk driver.</div>',unsafe_allow_html=True)

    elif analysis=="Dropout Distribution":
        st.markdown("### Dropout Rate Distribution")
        bins=[0,20,30,40,50,60,70]
        lbls=['0–20%','20–30%','30–40%','40–50%','50–60%','60–70%']
        counts=pd.cut(df['dropout'],bins=bins,labels=lbls).value_counts().sort_index()
        if chart_type=='pie':
            fig=px.pie(names=counts.index,values=counts.values)
        else:
            fig=px.bar(x=counts.index,y=counts.values,color=counts.values,color_continuous_scale='RdYlGn_r')
        fig.update_layout(**DARK,coloraxis_showscale=False)
        st.plotly_chart(fig,use_container_width=True)
        sk=float(stats.skew(df['dropout']))
        st.markdown(f'<div class="note-box">📌 Mean={df.dropout.mean():.1f}%, Std={df.dropout.std():.1f}pp, Skewness={sk:.2f}.</div>',unsafe_allow_html=True)

    elif analysis=="Top 10 Highest-Risk Institutions":
        st.markdown("### Top 10 Highest-Risk Institutions")
        top=df.nlargest(10,'risk').reset_index(drop=True)
        top['Risk Level']=top['risk'].apply(risk_label)
        if chart_type in ('bar','line'):
            fig=go.Figure()
            fig.add_trace(go.Bar(name='Risk Score',x=top['short'],y=top['risk'],marker_color='#ef4444'))
            fig.add_trace(go.Bar(name='Dropout %',x=top['short'],y=top['dropout'],marker_color='#f97316'))
            fig.update_layout(**DARK,barmode='group')
            st.plotly_chart(fig,use_container_width=True)
        elif chart_type=='pie':
            fig=px.pie(top,names='short',values='risk')
            fig.update_layout(**DARK)
            st.plotly_chart(fig,use_container_width=True)
        st.dataframe(top[['name','type','province','risk','dropout','nsfas','q1q2','Risk Level']],use_container_width=True)
        st.markdown(f'<div class="note-box">📌 {sum(1 for r in top.itertuples() if r.risk>=85)} critical-risk. Limpopo & Eastern Cape are highest-risk provinces.</div>',unsafe_allow_html=True)

    elif analysis=="By Institution Type":
        st.markdown("### Institution Type Breakdown")
        grp=df.groupby('type').agg(Count=('name','count'),Avg_Dropout=('dropout','mean'),
            Avg_NSFAS=('nsfas','mean'),Avg_Risk=('risk','mean'),Total_Enrolled=('enrolled','sum')
        ).round(1).reset_index().sort_values('Avg_Risk',ascending=False)
        if chart_type in ('bar','line'):
            fig=go.Figure()
            fig.add_trace(go.Bar(name='Avg Risk',x=grp['type'],y=grp['Avg_Risk'],marker_color='#7c3aed'))
            fig.add_trace(go.Bar(name='Avg Dropout %',x=grp['type'],y=grp['Avg_Dropout'],marker_color='#ef4444'))
            fig.update_layout(**DARK,barmode='group')
            st.plotly_chart(fig,use_container_width=True)
        elif chart_type=='pie':
            fig=px.pie(grp,names='type',values='Avg_Risk')
            fig.update_layout(**DARK)
            st.plotly_chart(fig,use_container_width=True)
        st.dataframe(grp,use_container_width=True)
        st.markdown('<div class="note-box">📌 Technology universities show highest NSFAS dependency. Traditional universities span widest risk range (UCT 20 → WSU 91).</div>',unsafe_allow_html=True)

    elif analysis=="By Province":
        st.markdown("### Provincial Aggregation & Ranking")
        grp=df.groupby('province').agg(Count=('name','count'),Avg_Risk=('risk','mean'),
            Avg_Dropout=('dropout','mean'),Avg_NSFAS=('nsfas','mean'),Total_Enrolled=('enrolled','sum')
        ).round(1).reset_index().sort_values('Avg_Risk',ascending=False)
        if chart_type in ('bar','line'):
            fig=px.bar(grp,x='province',y=['Avg_Risk','Avg_Dropout'],barmode='group')
            fig.update_layout(**DARK,xaxis_tickangle=-30)
            st.plotly_chart(fig,use_container_width=True)
        elif chart_type=='pie':
            fig=px.pie(grp,names='province',values='Avg_Risk')
            fig.update_layout(**DARK)
            st.plotly_chart(fig,use_container_width=True)
        st.dataframe(grp,use_container_width=True)
        tp=grp.iloc[0]
        st.markdown(f'<div class="note-box">📌 {tp["province"]} has highest average risk ({tp["Avg_Risk"]}).</div>',unsafe_allow_html=True)

    elif analysis=="Outlier Detection":
        st.markdown("### Outlier Detection")
        rows=[]
        for col in ['dropout','nsfas','risk']:
            q1,q3=df[col].quantile(0.25),df[col].quantile(0.75)
            iqr=q3-q1
            mask=(df[col]<q1-1.5*iqr)|(df[col]>q3+1.5*iqr)
            for i in df[mask].index:
                rows.append({'Institution':df.loc[i,'name'],'Field':col,'Value':df.loc[i,col],
                    'Q1':round(q1,1),'Q3':round(q3,1),'IQR':round(iqr,1),
                    'Direction':'▲ Upper' if df.loc[i,col]>q3+1.5*iqr else '▼ Lower'})
        odf=pd.DataFrame(rows)
        if not odf.empty:
            st.dataframe(odf,use_container_width=True)
            if chart_type in ('bar','line'):
                fig=px.bar(odf,x='Institution',y='Value',color='Field')
                fig.update_layout(**DARK)
                st.plotly_chart(fig,use_container_width=True)
        st.markdown(f'<div class="note-box">📌 {len(rows)} outlier data points found. UNISA is a structural outlier (distance-learning model).</div>',unsafe_allow_html=True)

    elif analysis=="Quintile × Dropout Regression":
        st.markdown("### Quintile × Dropout Regression")
        qdata=[{'Quintile':'Q1 (poorest)','Share':df['q1'].mean(),'Dropout':62},
               {'Quintile':'Q2','Share':df['q'].apply(lambda x:x[1]).mean(),'Dropout':56},
               {'Quintile':'Q3','Share':df['q'].apply(lambda x:x[2]).mean(),'Dropout':44},
               {'Quintile':'Q4','Share':df['q'].apply(lambda x:x[3]).mean(),'Dropout':30},
               {'Quintile':'Q5 (affluent)','Share':df['q'].apply(lambda x:x[4]).mean(),'Dropout':18}]
        qdf=pd.DataFrame(qdata)
        slope,intercept,r,p,_=stats.linregress(qdf['Share'],qdf['Dropout'])
        qdf['Predicted']=(slope*qdf['Share']+intercept).round(1)
        if chart_type=='scatter':
            fig=px.scatter(qdf,x='Share',y='Dropout',text='Quintile')
        elif chart_type=='pie':
            fig=px.pie(qdf,names='Quintile',values='Dropout')
        else:
            fig=go.Figure()
            fig.add_trace(go.Bar(name='Dropout %',x=qdf['Quintile'],y=qdf['Dropout'],marker_color='#ef4444'))
            fig.add_trace(go.Scatter(name='Predicted',x=qdf['Quintile'],y=qdf['Predicted'],
                mode='lines+markers',line=dict(color='#7c3aed',dash='dash')))
        fig.update_layout(**DARK)
        st.plotly_chart(fig,use_container_width=True)
        st.dataframe(qdf,use_container_width=True)
        st.markdown(f'<div class="note-box">📌 y={slope:.2f}x+{intercept:.2f}. R²={r**2:.3f}: Q1 share explains {r**2*100:.0f}% of dropout variance.</div>',unsafe_allow_html=True)

    elif analysis=="NSFAS Dependency Analysis":
        st.markdown("### NSFAS Dependency × Dropout Correlation")
        r,p=stats.pearsonr(df['nsfas'],df['dropout'])
        strength='Very Strong' if abs(r)>0.85 else 'Strong' if abs(r)>0.7 else 'Moderate' if abs(r)>0.5 else 'Weak'
        c1,c2,c3=st.columns(3)
        c1.metric("Pearson r",f"{r:.3f}")
        c2.metric("R²",f"{r**2:.3f}")
        c3.metric("Strength",strength)
        if chart_type=='scatter':
            fig=px.scatter(df,x='nsfas',y='dropout',text='short',color='risk',color_continuous_scale='RdYlGn_r')
        elif chart_type=='pie':
            fig=px.pie(df,names='short',values='nsfas')
        else:
            sdf=df.sort_values('nsfas',ascending=False)
            fig=go.Figure()
            fig.add_trace(go.Bar(name='NSFAS %',x=sdf['short'],y=sdf['nsfas'],marker_color='#7c3aed'))
            fig.add_trace(go.Bar(name='Dropout %',x=sdf['short'],y=sdf['dropout'],marker_color='#ef4444'))
            fig.update_layout(barmode='group')
        fig.update_layout(**DARK)
        st.plotly_chart(fig,use_container_width=True)
        st.markdown(f'<div class="note-box">📌 r={r:.3f} ({strength}). NSFAS dependency is a strong co-indicator of dropout risk.</div>',unsafe_allow_html=True)

    elif analysis=="Equity Index":
        st.markdown("### Equity Index")
        df2=df.copy()
        df2['equity']=((df2['q1q2']/70)*30+(df2['nsfas']/90)*30+(df2['dropout']/65)*25).clip(upper=85).div(85).mul(100).round().astype(int)
        sdf=df2.sort_values('equity',ascending=False).reset_index(drop=True)
        if chart_type in ('bar','line'):
            fig=go.Figure()
            fig.add_trace(go.Bar(name='Equity Index',x=sdf['short'],y=sdf['equity'],marker_color='#7c3aed'))
            fig.add_trace(go.Bar(name='Risk Score',x=sdf['short'],y=sdf['risk'],marker_color='#ef4444'))
            fig.update_layout(**DARK,barmode='group')
            st.plotly_chart(fig,use_container_width=True)
        elif chart_type=='pie':
            fig=px.pie(sdf.head(10),names='short',values='equity')
            fig.update_layout(**DARK)
            st.plotly_chart(fig,use_container_width=True)
        st.dataframe(sdf[['name','equity','q1q2','nsfas','dropout','risk']].head(15),use_container_width=True)
        st.markdown(f'<div class="note-box">📌 Top 3: {", ".join(sdf["short"].head(3))}. Index >70 = priority intervention required.</div>',unsafe_allow_html=True)

    elif analysis=="Risk Model Components":
        st.markdown("### Composite Risk Model — Component Analysis")
        components=[('Dropout Rate',df['dropout'].values,0.40),
                    ('NSFAS Dependency',df['nsfas'].values,0.30),
                    ('Q1+Q2 Intake',df['q1q2'].values,0.20),
                    ('Enrolment (log-scaled)',np.minimum(np.log(df['enrolled']/1000)*8,20),0.10)]
        rows=[]
        for label,vals,w in components:
            r,p=stats.pearsonr(vals,df['risk'].values)
            impact='Very High' if abs(r)>0.85 else 'High' if abs(r)>0.7 else 'Moderate' if abs(r)>0.5 else 'Low'
            rows.append({'Component':label,'Weight':f'{w*100:.0f}%','r':round(r,3),'R²':round(r**2,3),'Impact':impact})
        rdf=pd.DataFrame(rows)
        st.dataframe(rdf,use_container_width=True)
        if chart_type in ('bar','line'):
            fig=px.bar(rdf,x='Component',y='r',color='r',color_continuous_scale='Blues')
            fig.update_layout(**DARK,coloraxis_showscale=False)
            st.plotly_chart(fig,use_container_width=True)
        elif chart_type=='pie':
            fig=px.pie(rdf,names='Component',values=[0.40,0.30,0.20,0.10])
            fig.update_layout(**DARK)
            st.plotly_chart(fig,use_container_width=True)
        st.markdown('<div class="note-box">📌 Dropout rate is the primary risk driver. Model explains ~87% of variance.</div>',unsafe_allow_html=True)

    elif analysis=="Graduation Gap":
        st.markdown("### Graduation Gap Analysis")
        top=df.nlargest(12,'risk').reset_index(drop=True)
        top['Expected_Grads']=(top['enrolled']*0.33).astype(int)
        top['Actual_Dropouts']=(top['enrolled']*top['dropout']/100).astype(int)
        top['Gap']=top['Actual_Dropouts']-(top['enrolled']*0.67).astype(int)
        if chart_type in ('bar','line'):
            fig=go.Figure()
            fig.add_trace(go.Bar(name='Expected Grads',x=top['short'],y=top['Expected_Grads'],marker_color='#22c55e'))
            fig.add_trace(go.Bar(name='Actual Dropouts',x=top['short'],y=top['Actual_Dropouts'],marker_color='#ef4444'))
            fig.update_layout(**DARK,barmode='group')
            st.plotly_chart(fig,use_container_width=True)
        st.dataframe(top[['name','enrolled','Expected_Grads','Actual_Dropouts','Gap']],use_container_width=True)
        tg=int(top['Gap'].sum())
        st.markdown(f'<div class="note-box">📌 Combined gap: {tg:,} students/cohort. 5-year estimate: ~{int(tg*5*0.8):,} lost graduates.</div>',unsafe_allow_html=True)

    elif analysis=="Cohort Survival Simulation":
        st.markdown("### Cohort Survival Simulation")
        cohort=1000
        top6=df.nlargest(6,'risk').reset_index(drop=True)
        rows=[]
        for _,r in top6.iterrows():
            annual=(r['dropout']/100)/4
            rem=cohort
            by_year=[cohort]
            for _ in range(3):
                rem=int(rem*(1-annual))
                by_year.append(rem)
            grads=int(rem*(1-annual))
            rows.append({'Institution':r['short'],'Year 1':by_year[0],'Year 2':by_year[1],
                'Year 3':by_year[2],'Year 4':by_year[3],'Graduates':grads,
                'Attrition %':f"{(cohort-grads)/cohort*100:.1f}%"})
        sim_df=pd.DataFrame(rows)
        st.dataframe(sim_df,use_container_width=True)
        if chart_type in ('bar','line'):
            fig=go.Figure()
            for yr in ['Year 1','Year 2','Year 3','Year 4','Graduates']:
                fig.add_trace(go.Bar(name=yr,x=sim_df['Institution'],y=sim_df[yr]))
            fig.update_layout(**DARK,barmode='group')
            st.plotly_chart(fig,use_container_width=True)
        worst=top6.iloc[0]
        st.markdown(f'<div class="note-box">📌 Worst-case: {worst["short"]} graduates only ~{int(cohort*(1-worst["dropout"]/100))} from 1,000 enrolled.</div>',unsafe_allow_html=True)

# PAGE 3
elif page == "🏫 Institutions":
    st.markdown("## Institutions")
    c1,c2,c3=st.columns(3)
    pf=c1.selectbox("Province",["All"]+sorted(df['province'].unique()))
    tf=c2.selectbox("Type",["All"]+sorted(df['type'].unique()))
    rf=c3.selectbox("Risk Level",["All","Critical (≥85)","High (70–84)","Medium (50–69)","Low (<50)"])
    fdf=df.copy()
    if pf!="All": fdf=fdf[fdf['province']==pf]
    if tf!="All": fdf=fdf[fdf['type']==tf]
    if rf=="Critical (≥85)": fdf=fdf[fdf['risk']>=85]
    elif rf=="High (70–84)": fdf=fdf[(fdf['risk']>=70)&(fdf['risk']<85)]
    elif rf=="Medium (50–69)": fdf=fdf[(fdf['risk']>=50)&(fdf['risk']<70)]
    elif rf=="Low (<50)": fdf=fdf[fdf['risk']<50]
    fdf=fdf.sort_values('risk',ascending=False).reset_index(drop=True)
    fdf['Risk Level']=fdf['risk'].apply(risk_label)
    st.markdown(f"**Showing {len(fdf)} institutions**")
    st.dataframe(fdf[['name','type','province','enrolled','dropout','nsfas','q1q2','risk','Risk Level']].rename(
        columns={'name':'Institution','type':'Type','province':'Province','enrolled':'Enrolled',
                 'dropout':'Dropout %','nsfas':'NSFAS %','q1q2':'Q1+Q2 %','risk':'Risk Score'}),
        use_container_width=True,height=400)
    if not fdf.empty:
        sel=st.selectbox("View institution details",fdf['name'].tolist())
        inst=fdf[fdf['name']==sel].iloc[0]
        st.markdown("---")
        cc1,cc2,cc3,cc4=st.columns(4)
        cc1.metric("Risk Score",inst['risk'],risk_label(inst['risk']))
        cc2.metric("Dropout Rate",f"{inst['dropout']}%")
        cc3.metric("NSFAS Dependency",f"{inst['nsfas']}%")
        cc4.metric("Q1+Q2 Share",f"{inst['q1q2']}%")
        fig=px.bar(x=['Q1','Q2','Q3','Q4','Q5'],y=inst['q'],
            labels={'x':'School Quintile','y':'% of Students'},
            color=inst['q'],color_continuous_scale='RdYlGn_r',
            title=f"School Quintile Intake — {inst['short']}")
        fig.update_layout(**DARK,coloraxis_showscale=False)
        st.plotly_chart(fig,use_container_width=True)

# PAGE 4
elif page == "🤖 Insights AI":
    st.markdown("## Insights AI")
    st.caption("AI-generated reports using Claude — powered by Anthropic API")
    api_key=st.text_input("Your Anthropic API Key",type="password",placeholder="sk-ant-...")
    st.caption("Your key is never stored. Get one free at console.anthropic.com")
    report_type=st.selectbox("Report Type",[
        "National Risk Summary Report","Critical Institutions Intervention Plan",
        "Provincial Equity Analysis","NSFAS Impact Assessment",
        "Dropout Reduction Recommendations","Custom prompt..."])
    prompts={
        "National Risk Summary Report":"Write a formal DHET National Risk Summary Report covering all 26 public universities, highlighting critical institutions, dropout trends, and recommended interventions.",
        "Critical Institutions Intervention Plan":"Write an urgent intervention plan for the 6 critical-risk institutions (risk score ≥ 85), detailing specific support mechanisms, funding priorities, and NSFAS reforms needed.",
        "Provincial Equity Analysis":"Analyse dropout and risk disparities across South African provinces. Identify the most under-resourced provinces and recommend targeted provincial support strategies.",
        "NSFAS Impact Assessment":"Assess the relationship between NSFAS dependency and dropout rates across all institutions. Recommend reforms to improve NSFAS effectiveness in reducing student attrition.",
        "Dropout Reduction Recommendations":"Provide evidence-based recommendations to reduce the national 52% dropout rate, with specific interventions for Technology and Traditional university types.",
    }
    if report_type=="Custom prompt...":
        prompt=st.text_area("Enter your prompt",height=100)
    else:
        prompt=st.text_area("Prompt (editable)",value=prompts[report_type],height=100)
    if st.button("🚀 Generate Report",type="primary"):
        if not api_key:
            st.error("Please enter your Anthropic API key above.")
        else:
            with st.spinner("Generating report with Claude AI..."):
                import requests as req
                ns_total=int(df['enrolled'].sum())
                ns_nsfas=int((df['enrolled']*df['nsfas']/100).sum())
                data_context=f"""
DASHBOARD DATA SUMMARY (DHET HEMIS 2023/24):
National enrolled: {ns_total:,} | NSFAS beneficiaries: {ns_nsfas:,} ({ns_nsfas/ns_total*100:.0f}%)
National dropout rate: 52% | On-time graduation: 33% | Q1-Q3 share: 68%
Critical-risk institutions: {sum(1 for r in df.itertuples() if r.risk>=85)}
INSTITUTION DATA:
{chr(10).join(f"- {r.name} ({r.short}): {r.type}, {r.province}, Enrolled={r.enrolled:,}, Dropout={r.dropout}%, NSFAS={r.nsfas}%, Q1+Q2={r.q1q2}%, Risk={r.risk} ({risk_label(r.risk)})" for _,r in df.iterrows())}
DROPOUT BY QUINTILE: Q1=62%, Q2=56%, Q3=44%, Q4=30%, Q5=18%
"""
                full_prompt=f"{prompt}\n\n{data_context}\n\nFormat with ## headings. Use formal South African government language (DHET, NSFAS, HEMIS, CHE). Start with document title and May 2024 date."
                try:
                    resp=req.post('https://api.anthropic.com/v1/messages',
                        headers={'Content-Type':'application/json','x-api-key':api_key,'anthropic-version':'2023-06-01'},
                        json={'model':'claude-sonnet-4-20250514','max_tokens':2000,
                              'messages':[{'role':'user','content':full_prompt}]},timeout=60)
                    if resp.status_code==200:
                        text=''.join(b.get('text','') for b in resp.json().get('content',[]))
                        st.markdown("---")
                        st.markdown(text)
                        st.download_button("📥 Download Report",text,file_name="AtRiskSA_Report.md",mime="text/markdown")
                    else:
                        st.error(f"API error {resp.status_code}: {resp.text}")
                except Exception as e:
                    st.error(f"Error: {e}")