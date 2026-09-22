import streamlit as st
import pandas as pd
from pyvis.network import Network
import streamlit.components.v1 as components
from pathlib import Path

# --------------------------------------------------
# PAGE SETUP
# --------------------------------------------------

st.set_page_config(
    page_title="PayrollKG",
    page_icon="🧠",
    layout="wide"
)

st.title("🧠 PayrollKG")
st.caption("Interactive Knowledge Graph for Payroll Operations")


# --------------------------------------------------
# LOAD DATA
# --------------------------------------------------

@st.cache_data
def load_data():

    employees = pd.read_csv("employees.csv")

    triples = pd.read_csv(
        "payrollkg_triples.tsv",
        sep="\t",
        header=None,
        names=["Subject", "Relationship", "Object"],
        skip_blank_lines=True
    )

    return employees, triples


employees, triples = load_data()


# --------------------------------------------------
# SUMMARY
# --------------------------------------------------

col1, col2, col3 = st.columns(3)

col1.metric(
    "Employees",
    f"{len(employees):,}"
)

col2.metric(
    "Graph Relationships",
    f"{len(triples):,}"
)

col3.metric(
    "Relationship Types",
    f"{triples['Relationship'].nunique():,}"
)

st.divider()


# --------------------------------------------------
# ALL EMPLOYEES TABLE
# --------------------------------------------------

st.header("📋 Payroll Employees")

st.write(
    "Browse the employee dataset below, then select an employee "
    "to explore their relationships in the knowledge graph."
)

st.dataframe(
    employees,
    width="stretch",
    height=350,
    hide_index=True
)

st.divider()


# --------------------------------------------------
# FIND EMPLOYEE ID COLUMN
# --------------------------------------------------

possible_columns = [
    "employee_id",
    "employeeId",
    "Employee_ID",
    "EmployeeID",
    "employee",
    "Employee"
]

employee_column = None

for column in possible_columns:
    if column in employees.columns:
        employee_column = column
        break


# If employee ID is not obvious, use IDs from graph
if employee_column is not None:

    employee_ids = (
        employees[employee_column]
        .astype(str)
        .dropna()
        .unique()
        .tolist()
    )

else:

    employee_ids = (
        triples[
            triples["Subject"]
            .astype(str)
            .str.startswith("EMP-")
        ]["Subject"]
        .astype(str)
        .unique()
        .tolist()
    )


employee_ids = sorted(employee_ids)


# --------------------------------------------------
# EMPLOYEE SEARCH
# --------------------------------------------------

st.header("🔎 Employee Knowledge Graph")

selected_employee = st.selectbox(
    "Search or select an employee",
    employee_ids,
    index=None,
    placeholder="Type an employee ID — for example EMP-00005"
)


# --------------------------------------------------
# DISPLAY GRAPH ONLY AFTER EMPLOYEE IS SELECTED
# --------------------------------------------------

if selected_employee:

    st.success(f"Selected employee: {selected_employee}")

    # First-level relationships
    direct_relationships = triples[
        triples["Subject"].astype(str) == str(selected_employee)
    ].copy()

    if direct_relationships.empty:

        st.warning(
            "No graph relationships were found for this employee."
        )

    else:

        # ------------------------------------------
        # CREATE GRAPH
        # ------------------------------------------

        net = Network(
            height="650px",
            width="100%",
            bgcolor="#ffffff",
            font_color="#111111",
            directed=True
        )

        # Main employee node
        net.add_node(
            str(selected_employee),
            label=str(selected_employee),
            title="Employee",
            shape="dot",
            size=40
        )

        # Add connected nodes
        for _, row in direct_relationships.iterrows():

            target = str(row["Object"])
            relationship = str(row["Relationship"])

            net.add_node(
                target,
                label=target,
                title=target,
                shape="dot",
                size=25
            )

            net.add_edge(
                str(selected_employee),
                target,
                label=relationship,
                title=relationship,
                arrows="to"
            )

        # ------------------------------------------
        # GRAPH BEHAVIOR
        # ------------------------------------------

        net.set_options("""
        {
          "physics": {
            "enabled": true,
            "barnesHut": {
              "gravitationalConstant": -9000,
              "centralGravity": 0.2,
              "springLength": 190,
              "springConstant": 0.04
            },
            "stabilization": {
              "iterations": 200
            }
          },

          "nodes": {
            "font": {
              "size": 16
            }
          },

          "edges": {
            "font": {
              "size": 14,
              "align": "middle"
            },
            "smooth": {
              "enabled": true
            }
          },

          "interaction": {
            "hover": true,
            "navigationButtons": true,
            "keyboard": true,
            "zoomView": true,
            "dragView": true
          }
        }
        """)

        # ------------------------------------------
        # SAVE TEMP GRAPH
        # ------------------------------------------

        graph_path = Path("employee_graph.html")

        net.save_graph(str(graph_path))

        html = graph_path.read_text(
            encoding="utf-8"
        )

        st.subheader(
            f"Relationships for {selected_employee}"
        )

        components.html(
            html,
            height=680,
            scrolling=False
        )

        # ------------------------------------------
        # EVIDENCE
        # ------------------------------------------

        with st.expander("View graph relationships"):

            st.dataframe(
                direct_relationships,
                width="stretch",
                hide_index=True
            )


else:

    st.info(
        "Select an employee above to generate their knowledge graph."
    )