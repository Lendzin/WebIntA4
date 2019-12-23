import React, { Component } from 'react';
import './App.css';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';

export default class UserSimIndexTable extends Component {
	constructor(props) {
		super(props);
        this.state = {

           }
	}

    render() {
        return (
        <>
        <div 
            className="ag-theme-balham"
            style={{ 
            height: `${this.props.data.length !== 0 ? this.props.data.length * 31 + 40 : 0}px`, 
            width: '600px' }} 
        >   
            {this.props.data.length !== 0 ? 'Score Table:' : <span></span>}
            <AgGridReact
            columnDefs={[{
                    headerName: "Page", field: "fileName", width: 200
                }, {
                    headerName: "Score", field: "score", width: 100
                }, {
                    headerName: "Content", field: "content", width: 100
                }, {
                    headerName: "Location", field: "location", width: 100
                }, {
                    headerName: "PageRank", field: "pagerank", width: 100
            }]}
            
            rowData={this.props.data}>
            </AgGridReact>
        </div>
        </>
        );
    }
}