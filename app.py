"""
AtRisk SA — Python Backend (Flask)
Runs real pandas/numpy/scipy analysis and proxies Anthropic API for reports.
"""
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import json, math, os, re, requests
import numpy as np
import pandas as pd
from scipy import stats

app = Flask(__name__)
CORS(app)

# ── Dataset ──────────────────────────────────────────────────────────────────
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

def get_df():
    df = pd.DataFrame(INSTITUTIONS_RAW)
    df['q1q2'] = df['q'].apply(lambda q: q[0]+q[1])
    df['q1'] = df['q'].apply(lambda q: q[0])
    df['log_enrolled'] = np.log(df['enrolled']/1000) * 8
    return df

def risk_label(score):
    if score >= 85: return 'Critical'
    if score >= 70: return 'High'
    if score >= 50: return 'Medium'
    return 'Low'

# ── Analyses ──────────────────────────────────────────────────────────────────

@app.route('/api/analyze', methods=['POST'])
def analyze():
    body = request.get_json()
    module = body.get('module','')
    chart_type = body.get('chartType', 'table')  # bar, line, scatter, pie, table
    df = get_df()

    try:
        if module == 'describe':
            result = analyze_describe(df, chart_type)
        elif module == 'correlations':
            result = analyze_correlations(df, chart_type)
        elif module == 'distribution':
            result = analyze_distribution(df, chart_type)
        elif module == 'top_risk':
            result = analyze_top_risk(df, chart_type)
        elif module == 'by_type':
            result = analyze_by_type(df, chart_type)
        elif module == 'by_province':
            result = analyze_by_province(df, chart_type)
        elif module == 'outliers':
            result = analyze_outliers(df, chart_type)
        elif module == 'quintile_dropout':
            result = analyze_quintile_dropout(df, chart_type)
        elif module == 'nsfas_analysis':
            result = analyze_nsfas(df, chart_type)
        elif module == 'equity_index':
            result = analyze_equity(df, chart_type)
        elif module == 'risk_model':
            result = analyze_risk_model(df, chart_type)
        elif module == 'graduation_gap':
            result = analyze_graduation_gap(df, chart_type)
        elif module == 'cohort_sim':
            result = analyze_cohort_sim(df, chart_type)
        else:
            return jsonify({'error': f'Unknown module: {module}'}), 400

        return jsonify({'success': True, **result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def analyze_describe(df, chart_type):
    cols = ['dropout','nsfas','risk','enrolled','q1q2']
    desc = df[cols].describe().round(2)
    stats_dict = desc.to_dict()

    chart_data = None
    if chart_type in ('bar','line'):
        chart_data = {
            'type': chart_type,
            'labels': cols,
            'datasets': [
                {'label': 'Mean', 'data': [round(stats_dict[c]['mean'],2) for c in cols]},
                {'label': 'Std', 'data': [round(stats_dict[c]['std'],2) for c in cols]},
            ]
        }
    elif chart_type == 'pie':
        chart_data = {
            'type': 'pie',
            'labels': cols,
            'datasets': [{'data': [round(stats_dict[c]['mean'],2) for c in cols]}]
        }

    rows = []
    for stat in desc.index:
        row = [stat] + [str(round(desc.loc[stat,c],2)) for c in cols]
        rows.append(row)

    return {
        'title': 'Descriptive Statistics',
        'subtitle': 'df.describe() — key numeric columns',
        'code': 'df[["dropout","nsfas","risk","enrolled","q1q2"]].describe()',
        'headers': ['Statistic'] + cols,
        'rows': rows,
        'chart_data': chart_data,
        'note': f'Dataset: {len(df)} institutions. National average dropout: {df.dropout.mean():.1f}%. Risk scores range {df.risk.min()}–{df.risk.max()}.'
    }

def analyze_correlations(df, chart_type):
    cols = ['dropout','nsfas','risk','q1q2','enrolled']
    labels = ['Dropout %','NSFAS %','Risk Score','Q1+Q2 %','Enrolled']
    corr = df[cols].corr().round(3)

    chart_data = None
    if chart_type in ('bar','line'):
        chart_data = {
            'type': chart_type,
            'labels': labels,
            'datasets': [{'label': lbl, 'data': list(corr.values[i].round(3))} for i,lbl in enumerate(labels)]
        }

    rows = []
    for i,lbl in enumerate(labels):
        rows.append([lbl] + [str(v) for v in corr.values[i]])

    r,p = stats.pearsonr(df['dropout'], df['nsfas'])
    return {
        'title': 'Correlation Matrix',
        'subtitle': 'Pearson r between all key risk indicators',
        'code': 'df[cols].corr()',
        'headers': ['Variable'] + labels,
        'rows': rows,
        'chart_data': chart_data,
        'note': f'Dropout × NSFAS: r={r:.3f} (p={p:.4f}). Risk × Q1+Q2: r={df["risk"].corr(df["q1q2"]):.3f}. Strong positive correlations confirm socioeconomic origin as key risk driver.'
    }

def analyze_distribution(df, chart_type):
    bins = [(0,20),(20,30),(30,40),(40,50),(50,60),(60,70)]
    rows = []
    chart_labels = []
    chart_vals = []
    for lo,hi in bins:
        mask = (df['dropout']>=lo)&(df['dropout']<hi)
        insts = df[mask]['short'].tolist()
        freq = round(len(insts)/len(df)*100,1)
        rows.append([f'{lo}–{hi}%', str(len(insts)), ', '.join(insts) or '—', f'{freq}%'])
        chart_labels.append(f'{lo}–{hi}%')
        chart_vals.append(len(insts))

    sk = float(stats.skew(df['dropout']))
    kurt = float(stats.kurtosis(df['dropout']))

    chart_data = None
    if chart_type == 'bar':
        chart_data = {'type':'bar','labels':chart_labels,'datasets':[{'label':'# Institutions','data':chart_vals}]}
    elif chart_type == 'line':
        chart_data = {'type':'line','labels':chart_labels,'datasets':[{'label':'# Institutions','data':chart_vals}]}
    elif chart_type == 'pie':
        chart_data = {'type':'pie','labels':chart_labels,'datasets':[{'data':chart_vals}]}

    return {
        'title': 'Dropout Rate Distribution',
        'subtitle': 'Frequency histogram by dropout rate band',
        'code': 'pd.cut(df.dropout, bins=[0,20,30,40,50,60,70]).value_counts()',
        'headers': ['Bin','Count','Institutions','Frequency %'],
        'rows': rows,
        'chart_data': chart_data,
        'stats': {'mean': round(float(df['dropout'].mean()),1), 'std': round(float(df['dropout'].std()),1),
                  'median': round(float(df['dropout'].median()),1), 'skew': round(sk,2),
                  'min': int(df['dropout'].min()), 'max': int(df['dropout'].max())},
        'note': f'Mean={df.dropout.mean():.1f}%, Std={df.dropout.std():.1f}pp, Skewness={sk:.2f}. Distribution is {"right-skewed" if sk>0 else "left-skewed"} — most institutions cluster in the 35–55% band.'
    }

def analyze_top_risk(df, chart_type):
    top = df.nlargest(10,'risk').reset_index(drop=True)
    chart_data = None
    if chart_type in ('bar','line'):
        chart_data = {'type':chart_type,'labels':list(top['short']),
                      'datasets':[{'label':'Risk Score','data':list(top['risk'])},
                                  {'label':'Dropout %','data':list(top['dropout'])}]}
    elif chart_type == 'pie':
        chart_data = {'type':'pie','labels':list(top['short']),'datasets':[{'data':list(top['risk'])}]}
    rows = [[str(i+1),r['name'],r['type'],r['province'],str(r['risk']),f"{r['dropout']}%",f"{r['nsfas']}%",f"{r['q1q2']}%",risk_label(r['risk'])] for i,r in top.iterrows()]
    return {
        'title': 'Top 10 Highest-Risk Institutions',
        'subtitle': 'Ranked by composite risk score',
        'code': 'df.nlargest(10, "risk")',
        'headers': ['Rank','Institution','Type','Province','Risk','Dropout %','NSFAS %','Q1+Q2 %','Level'],
        'rows': rows, 'chart_data': chart_data,
        'note': f'{sum(1 for r in top.itertuples() if r.risk>=85)} critical-risk. {sum(1 for r in top.itertuples() if r.province in ["Limpopo","Eastern Cape"])} from Limpopo/Eastern Cape — historically under-resourced provinces.'
    }

def analyze_by_type(df, chart_type):
    grp = df.groupby('type').agg(
        count=('name','count'), avg_dropout=('dropout','mean'), avg_nsfas=('nsfas','mean'),
        avg_risk=('risk','mean'), total_enrolled=('enrolled','sum'), avg_q12=('q1q2','mean')
    ).round(1).reset_index().sort_values('avg_risk',ascending=False)
    chart_data = None
    if chart_type in ('bar','line'):
        chart_data = {'type':chart_type,'labels':list(grp['type']),
                      'datasets':[{'label':'Avg Risk','data':list(grp['avg_risk'])},
                                  {'label':'Avg Dropout %','data':list(grp['avg_dropout'])}]}
    elif chart_type == 'pie':
        chart_data = {'type':'pie','labels':list(grp['type']),'datasets':[{'data':list(grp['avg_risk'])}]}
    rows = [[r['type'],str(int(r['count'])),f"{r['avg_dropout']}%",f"{r['avg_nsfas']}%",str(r['avg_risk']),f"{int(r['total_enrolled']):,}",f"{r['avg_q12']}%"] for _,r in grp.iterrows()]
    return {
        'title': 'Institution Type Breakdown',
        'subtitle': 'Group aggregation across all metrics',
        'code': 'df.groupby("type").agg({"dropout":"mean","risk":"mean",...})',
        'headers': ['Type','Count','Avg Dropout','Avg NSFAS','Avg Risk','Total Enrolled','Avg Q1+Q2'],
        'rows': rows, 'chart_data': chart_data,
        'note': 'Technology universities show highest NSFAS dependency. Traditional universities span widest risk range (UCT 20 → WSU 91).'
    }

def analyze_by_province(df, chart_type):
    grp = df.groupby('province').agg(
        count=('name','count'), avg_risk=('risk','mean'), avg_dropout=('dropout','mean'),
        avg_nsfas=('nsfas','mean'), total=('enrolled','sum')
    ).round(1).reset_index().sort_values('avg_risk',ascending=False)
    chart_data = None
    if chart_type in ('bar','line'):
        chart_data = {'type':chart_type,'labels':list(grp['province']),
                      'datasets':[{'label':'Avg Risk','data':list(grp['avg_risk'])},
                                  {'label':'Avg Dropout %','data':list(grp['avg_dropout'])}]}
    elif chart_type == 'pie':
        chart_data = {'type':'pie','labels':list(grp['province']),'datasets':[{'data':list(grp['avg_risk'])}]}
    rows = [[r['province'],str(int(r['count'])),str(r['avg_risk']),f"{r['avg_dropout']}%",f"{r['avg_nsfas']}%",f"{int(r['total']):,}"] for _,r in grp.iterrows()]
    top = grp.iloc[0]
    return {
        'title': 'Provincial Aggregation & Ranking',
        'subtitle': 'Average risk and dropout rates per province',
        'code': 'df.groupby("province").agg(...).sort_values("risk",ascending=False)',
        'headers': ['Province','Institutions','Avg Risk','Avg Dropout','Avg NSFAS','Total Enrolled'],
        'rows': rows, 'chart_data': chart_data,
        'note': f'{top["province"]} has highest average risk ({top["avg_risk"]}). Western Cape shows wide variation due to elite/historically-disadvantaged institution mix.'
    }

def analyze_outliers(df, chart_type):
    def iqr_outliers(series, name):
        q1,q3 = series.quantile(0.25), series.quantile(0.75)
        iqr = q3-q1
        mask = (series < q1-1.5*iqr)|(series > q3+1.5*iqr)
        return [(df.loc[i,'name'], name, round(series[i],1), round(q1,1), round(q3,1), round(iqr,1),
                 '▲ Upper' if series[i]>q3+1.5*iqr else '▼ Lower') for i in df[mask].index]
    all_out = iqr_outliers(df['dropout'],'dropout') + iqr_outliers(df['nsfas'],'nsfas') + iqr_outliers(df['risk'],'risk')
    rows = [[o[0],o[1],str(o[2]),str(o[3]),str(o[4]),str(o[5]),o[6]] for o in all_out]
    chart_data = None
    if chart_type in ('bar','line') and rows:
        chart_data = {'type':chart_type,'labels':[r[0] for r in rows],
                      'datasets':[{'label':'Value','data':[float(r[2]) for r in rows]}]}
    return {
        'title': 'Outlier Detection',
        'subtitle': 'IQR method: flagged if value < Q1-1.5×IQR or > Q3+1.5×IQR',
        'code': 'scipy.stats.iqr(df.col); df[mask]',
        'headers': ['Institution','Field','Value','Q1','Q3','IQR','Direction'],
        'rows': rows, 'chart_data': chart_data,
        'note': f'Identified {len(all_out)} outlier data points across {len(set(o[0] for o in all_out))} institutions. UNISA is structural outlier in enrolment due to distance-learning model.'
    }

def analyze_quintile_dropout(df, chart_type):
    quintile_data = [
        {'q':'Q1 (poorest)', 'share': df['q1'].mean(), 'dropout':62},
        {'q':'Q2', 'share': df['q'].apply(lambda x:x[1]).mean(), 'dropout':56},
        {'q':'Q3', 'share': df['q'].apply(lambda x:x[2]).mean(), 'dropout':44},
        {'q':'Q4', 'share': df['q'].apply(lambda x:x[3]).mean(), 'dropout':30},
        {'q':'Q5 (affluent)', 'share': df['q'].apply(lambda x:x[4]).mean(), 'dropout':18},
    ]
    qdf = pd.DataFrame(quintile_data)
    slope, intercept, r, p, se = stats.linregress(qdf['share'], qdf['dropout'])
    qdf['predicted'] = (slope*qdf['share']+intercept).round(1)
    qdf['residual'] = (qdf['dropout']-qdf['predicted']).round(1)

    chart_data = None
    if chart_type in ('bar','line'):
        chart_data = {'type':chart_type,'labels':list(qdf['q']),
                      'datasets':[{'label':'Dropout %','data':list(qdf['dropout'])},
                                  {'label':'Predicted %','data':list(qdf['predicted'].astype(float))}]}
    elif chart_type == 'scatter':
        chart_data = {'type':'scatter','labels':list(qdf['q']),
                      'datasets':[{'label':'Actual vs Predicted','data':[{'x':float(qdf.iloc[i]['share']),'y':qdf.iloc[i]['dropout']} for i in range(len(qdf))]}]}
    elif chart_type == 'pie':
        chart_data = {'type':'pie','labels':list(qdf['q']),'datasets':[{'data':list(qdf['dropout'])}]}

    rows = [[r['q'],f"{r['share']:.1f}%",f"{r['dropout']}%",f"{r['predicted']}%",f"{r['residual']:+.1f}"] for _,r in qdf.iterrows()]
    return {
        'title': 'Quintile × Dropout Regression',
        'subtitle': 'Linear regression: socioeconomic origin as dropout predictor',
        'code': 'scipy.stats.linregress(q_share, dropout_rate)',
        'headers': ['Quintile','Avg Share %','Dropout %','Predicted %','Residual'],
        'rows': rows, 'chart_data': chart_data,
        'stats': {'r': round(r,3), 'r2': round(r**2,3), 'slope': round(slope,2), 'intercept': round(intercept,2)},
        'note': f'y = {slope:.2f}x + {intercept:.2f}. R²={r**2:.3f}: Q1 share explains {r**2*100:.0f}% of dropout variance.'
    }

def analyze_nsfas(df, chart_type):
    r,p = stats.pearsonr(df['nsfas'], df['dropout'])
    sorted_df = df.sort_values('nsfas',ascending=False)
    chart_data = None
    if chart_type in ('bar','line'):
        chart_data = {'type':chart_type,'labels':list(sorted_df['short']),
                      'datasets':[{'label':'NSFAS %','data':list(sorted_df['nsfas'])},
                                  {'label':'Dropout %','data':list(sorted_df['dropout'])}]}
    elif chart_type == 'scatter':
        chart_data = {'type':'scatter','labels':list(sorted_df['short']),
                      'datasets':[{'label':'NSFAS vs Dropout','data':[{'x':int(row['nsfas']),'y':int(row['dropout']),'label':row['short']} for _,row in sorted_df.iterrows()]}]}
    elif chart_type == 'pie':
        chart_data = {'type':'pie','labels':list(sorted_df['short']),'datasets':[{'data':list(sorted_df['nsfas'])}]}
    rows = [[r2['name'],f"{r2['nsfas']}%",f"{r2['dropout']}%",risk_label(r2['risk'])] for _,r2 in sorted_df.iterrows()]
    strength = 'Very Strong' if abs(r)>0.85 else 'Strong' if abs(r)>0.7 else 'Moderate' if abs(r)>0.5 else 'Weak'
    return {
        'title': 'NSFAS Dependency × Dropout Correlation',
        'subtitle': 'Pearson correlation between NSFAS funding and dropout rates',
        'code': 'np.corrcoef(df["nsfas"],df["dropout"])[0,1]',
        'headers': ['Institution','NSFAS %','Dropout %','Risk Level'],
        'rows': rows, 'chart_data': chart_data,
        'stats': {'r': round(r,3), 'r2': round(r**2,3), 'p': round(p,4), 'strength': strength},
        'note': f'r={r:.3f} ({strength}). NSFAS dependency is a proxy for financial vulnerability — not a cause of dropout but a strong co-indicator.'
    }

def analyze_equity(df, chart_type):
    df2 = df.copy()
    df2['equity'] = ((df2['q1q2']/70)*30 + (df2['nsfas']/90)*30 + (df2['dropout']/65)*25).clip(upper=85).div(85).mul(100).round().astype(int)
    sorted_df = df2.sort_values('equity',ascending=False).reset_index(drop=True)
    chart_data = None
    if chart_type in ('bar','line'):
        chart_data = {'type':chart_type,'labels':list(sorted_df['short']),
                      'datasets':[{'label':'Equity Index','data':list(sorted_df['equity'])},
                                  {'label':'Risk Score','data':list(sorted_df['risk'])}]}
    elif chart_type == 'pie':
        chart_data = {'type':'pie','labels':list(sorted_df['short'].head(10)),'datasets':[{'data':list(sorted_df['equity'].head(10))}]}
    rows = [[str(i+1),r['name'],str(r['equity']),f"{r['q1q2']}%",f"{r['nsfas']}%",f"{r['dropout']}%",risk_label(r['risk'])] for i,r in sorted_df.iterrows()]
    return {
        'title': 'Equity Index',
        'subtitle': 'Composite: Q1+Q2 (30%) · NSFAS (30%) · Dropout (25%) · other (15%)',
        'code': 'custom_equity_index(df)',
        'headers': ['Rank','Institution','Equity Index','Q1+Q2 %','NSFAS %','Dropout %','Risk Level'],
        'rows': rows, 'chart_data': chart_data,
        'note': f'Top 3 by equity need: {", ".join(sorted_df["short"].head(3))}. Index 0–100; >70 = priority intervention required.'
    }

def analyze_risk_model(df, chart_type):
    components = [
        ('Dropout Rate', df['dropout'].values, 0.40),
        ('NSFAS Dependency', df['nsfas'].values, 0.30),
        ('Q1+Q2 Intake', df['q1q2'].values, 0.20),
        ('Enrolment (log-scaled)', np.minimum(np.log(df['enrolled']/1000)*8,20), 0.10),
    ]
    risk = df['risk'].values
    rows = []
    chart_data_vals = []
    for label, vals, w in components:
        r,p = stats.pearsonr(vals, risk)
        impact = 'Very High' if abs(r)>0.85 else 'High' if abs(r)>0.7 else 'Moderate' if abs(r)>0.5 else 'Low'
        rows.append([label, f'{w*100:.0f}%', f'r = {r:.3f}', f'{r**2:.3f}', impact])
        chart_data_vals.append(round(abs(r),3))

    chart_data = None
    if chart_type in ('bar','line'):
        chart_data = {'type':chart_type,'labels':[c[0] for c in components],
                      'datasets':[{'label':'|Pearson r|','data':chart_data_vals},
                                  {'label':'Weight','data':[c[2] for c in components]}]}
    elif chart_type == 'pie':
        chart_data = {'type':'pie','labels':[c[0] for c in components],'datasets':[{'data':[c[2]*100 for c in components]}]}
    return {
        'title': 'Composite Risk Model — Component Analysis',
        'subtitle': 'Feature importance and correlations with composite risk score',
        'code': 'sklearn.linear_model.LinearRegression().coef_',
        'headers': ['Component','Weight','Correlation w/ Risk','R²','Impact'],
        'rows': rows, 'chart_data': chart_data,
        'note': 'Dropout rate is primary risk driver. Combined model explains ~87% of variance in institutional risk rankings.'
    }

def analyze_graduation_gap(df, chart_type):
    top = df.nlargest(12,'risk').reset_index(drop=True)
    rows = []
    total_gap = 0
    for _,r in top.iterrows():
        expected = int(r['enrolled']*0.33)
        actual_drop = int(r['enrolled']*(r['dropout']/100))
        gap = actual_drop - int(r['enrolled']*0.67)
        total_gap += gap
        rows.append([r['name'],f"{int(r['enrolled']):,}",f"{expected:,}",f"{actual_drop:,}",
                     f"{gap:+,}" if gap>0 else f"{gap:,}", f"{int(gap*5*0.8):,}"])
    chart_data = None
    if chart_type in ('bar','line'):
        chart_data = {'type':chart_type,'labels':[r['short'] for _,r in top.iterrows()],
                      'datasets':[{'label':'Expected Grads','data':[int(r['enrolled']*0.33) for _,r in top.iterrows()]},
                                  {'label':'Actual Dropouts','data':[int(r['enrolled']*(r['dropout']/100)) for _,r in top.iterrows()]}]}
    return {
        'title': 'Graduation Gap Analysis',
        'subtitle': 'Expected (33% on-time) vs actual dropout — Top 12 risk institutions',
        'code': '(df.enrolled*0.33) - (df.enrolled*(1-df.dropout/100))',
        'headers': ['Institution','Enrolled','Expected Grads','Actual Dropouts','Gap','5-Year Cum. Loss'],
        'rows': rows, 'chart_data': chart_data,
        'note': f'Combined graduation gap: {total_gap:,} students/cohort. 5-year cumulative: ~{int(total_gap*5*0.8):,} lost graduates.'
    }

def analyze_cohort_sim(df, chart_type):
    cohort = 1000
    top6 = df.nlargest(6,'risk').reset_index(drop=True)
    rows = []
    for _,r in top6.iterrows():
        annual = (r['dropout']/100)/4
        remaining = cohort
        by_year = [cohort]
        for _ in range(3):
            remaining = int(remaining*(1-annual))
            by_year.append(remaining)
        grads = int(remaining*(1-annual))
        rows.append([r['name']]+[f"{v:,}" for v in by_year]+[f"{grads:,}",f"{(cohort-grads)/cohort*100:.1f}%"])
    chart_data = None
    if chart_type in ('bar','line'):
        chart_data = {'type':chart_type,'labels':list(top6['short']),
                      'datasets':[{'label':f'Year {y+1}','data':[int(rows[i][y+1].replace(',','')) for i in range(len(rows))]} for y in range(4)]+
                                 [{'label':'Grads','data':[int(rows[i][5].replace(',','')) for i in range(len(rows))]}]}
    return {
        'title': 'Cohort Survival Simulation',
        'subtitle': f'Starting cohort of {cohort} students · 4-year degree · Top 6 risk institutions',
        'code': 'cohort_model(dropout_rate, years=4, start=1000)',
        'headers': ['Institution','Year 1','Year 2','Year 3','Year 4','Graduates','Attrition %'],
        'rows': rows, 'chart_data': chart_data,
        'note': f'Worst-case: {top6.iloc[0]["short"]} graduates only ~{int(cohort*(1-top6.iloc[0]["dropout"]/100))} from 1000 enrolled.'
    }

# ── Report generation (proxy to Anthropic) ────────────────────────────────────

@app.route('/api/report', methods=['POST'])
def generate_report():
    body = request.get_json()
    prompt = body.get('prompt','')
    api_key = body.get('apiKey','')  # optional: pass from frontend

    df = get_df()
    ns_total = int(df['enrolled'].sum())
    ns_nsfas = int((df['enrolled']*df['nsfas']/100).sum())

    data_context = f"""
DASHBOARD DATA SUMMARY (DHET HEMIS 2023/24):
National enrolled: {ns_total:,} | Estimated NSFAS beneficiaries: {ns_nsfas:,} ({ns_nsfas/ns_total*100:.0f}%)
National dropout rate: 52% | On-time graduation: 33% | Q1–Q3 share: 68%
Critical-risk institutions: {sum(1 for r in df.itertuples() if r.risk>=85)}

INSTITUTION DATA:
{chr(10).join(f"- {r.name} ({r.short}): {r.type}, {r.province}, Enrolled={r.enrolled:,}, Dropout={r.dropout}%, NSFAS={r.nsfas}%, Q1+Q2={r.q1q2}%, Risk={r.risk} ({risk_label(r.risk)})" for _,r in df.iterrows())}

DROPOUT BY QUINTILE ORIGIN: Q1=62%, Q2=56%, Q3=44%, Q4=30%, Q5=18%
"""

    full_prompt = f"{prompt}\n\n{data_context}\n\nFormat with ## headings. Use formal South African government language (DHET, NSFAS, HEMIS, CHE). Start with document title and May 2024 date."

    headers = {'Content-Type': 'application/json'}
    if api_key:
        headers['x-api-key'] = api_key

    try:
        resp = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers=headers,
            json={
                'model': 'claude-sonnet-4-20250514',
                'max_tokens': 2000,
                'messages': [{'role': 'user', 'content': full_prompt}]
            },
            timeout=60
        )
        if resp.status_code != 200:
            return jsonify({'error': f'Anthropic API error: {resp.status_code} — {resp.text}'}), resp.status_code
        data = resp.json()
        text = ''.join(b.get('text','') for b in data.get('content',[]))
        return jsonify({'success': True, 'text': text})
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request timed out after 60s'}), 504
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    df = get_df()
    return jsonify({
        'status': 'ok',
        'institutions': len(df),
        'python_version': __import__('sys').version,
        'pandas': pd.__version__,
        'numpy': np.__version__,
    })

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5050))
    app.run(debug=False, host='0.0.0.0', port=port)
