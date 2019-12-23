import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { Container } from 'react-bootstrap';

import StartPage from './StartPage';


class App extends Component {
	
	render() {
		return (
			<Container>
				<StartPage />
			</Container>
		);
	}
}

export default App;