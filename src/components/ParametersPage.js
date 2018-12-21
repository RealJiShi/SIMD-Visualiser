import React, {Component} from 'react';
import styled from 'styled-components'
import {
    Button, Card, CardBody, CardTitle, Row, Col, Container, ButtonGroup
} from 'reactstrap';
import * as _ from "lodash";
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import 'rc-tooltip/assets/bootstrap.css';
import {FAST_CALL_REGISTERS, TYPE_LENGTH} from "../Utils/Registry";
import {convert} from "../Utils/Converter";

const PageContainer = styled.div`
    padding: 50px;
`

const Title = styled.div`
    font-size: 60px;
    font-weight: 700;
    color: rgb(72, 72, 72);
    margin-bottom: 15px;
    text-align: center;
`

const SubmitButton = styled.div`
    position: absolute;
    bottom: 50px;
    left: calc(75% - 55px);
    button{font-size: 1.5rem};
`
const FunctionContainer = styled.div`

`
const FunctionName = styled.div`
    text-align: center;
    margin-top: 50px;
    font-size: 32px;
    font-weight: normal;
    color: rgb(72, 72, 72);
`

const ParameterContainer = styled.div`
    padding: 20px 0;
    
    .card-title {
        margin-bottom: 0;
        height: 100%;
        line-height: 1.7rem;
    }
    
    .card-body{
        padding: 1rem;
        
        .row{
            margin-bottom: 10px;
        }
    
`

const ParameterOptionTitle = styled(Col)`
    align-self: center;
    height: 1.5rem;
`

const RandomizeButton = styled.div`
    float: right;
    cursor: pointer;
    color: var(--one);
    font-size: 1.7rem;
`

const VectorContainer = styled(Container)`
    width: 96% !important;
    height: 50px;
    background-color: var(--main);
    border-radius: 3px;
    //margin: 0 2%;
    box-shadow: 3px 3px 2px rgba(0,0,0,.4);
    
    .row{
        height: 100%;
    
        .col{
            text-align: center;
            padding: 0;
            
            input{
                width: 100%;
                height: 100%;
                color: var(--clear-text-color);
                text-align: center;
                border-radius: 0;
                border: none;
                background-color: inherit;
                border-right: solid 1px var(--gray);
            }
            
            :last-child input{
                    border-right: none;
                }
        }
    }
}
`;

export default class ParametersPage extends Component {
    constructor(props) {
        super(props);
        this.setRegistersNamesAndValues();
    }

    componentDidMount() {

    }

    setRegistersNamesAndValues() {
        this.props.asm.forEach((func, i) => {
            let generalPurposeRegisterCount = 0;
            let simdRegisterCount = 0;
            func.params.forEach((param, j) => {
                //if param.lanes === 1, it means we have a general purpose register. (it's not a vector)
                if (param.lanes === 1) {
                    param.register = FAST_CALL_REGISTERS[generalPurposeRegisterCount];
                    generalPurposeRegisterCount++;
                }
                else {
                    //reconstruct the SIMD register name.
                    param.register = _.invert(TYPE_LENGTH)[(param.bitWidth * param.lanes) / 8] + "mm" + simdRegisterCount;
                    simdRegisterCount++;
                }
                this.randomizeRegister(i, j)
            })
        })
    }

    getSliderMarks(paramBitLen) {
        //Make sure laneWidth cannot be smaller than 4 bits
        paramBitLen = _.max([4, paramBitLen]);
        //Make sure laneWidth cannot be bigger than 64 bits
        paramBitLen = _.min([paramBitLen, 64]);
        const nbOfMarks = Math.log(paramBitLen) / Math.log(2) - 1;
        let marks = {};
        _.times(nbOfMarks).forEach(i => {
            const percentage = 100 * (i + 1) / nbOfMarks;
            marks[percentage] = Math.pow(2, i + 2);
        });

        return marks
    };

    onTypeChange(selected, functionNumber, paramNumber) {
        this.props.asm[functionNumber].params[paramNumber].type = selected;
        this.forceUpdate();
    }

    onWidthChange(newWidth, functionNumber, paramNumber) {
        let param = this.props.asm[functionNumber].params[paramNumber];
        const bitLen = param.bitWidth * param.lanes;
        param.value = convert(param.value, param.type, newWidth, param.type, param.bitWidth);
        param.bitWidth = newWidth;
        param.lanes = bitLen / newWidth;

        this.forceUpdate();
    }

    onBaseChange(selected, functionNumber, paramNumber) {
        this.props.asm[functionNumber].params[paramNumber].base = selected;
        this.forceUpdate();
    }

    onVectorValueChange(val, functionNumber, paramNumber, lane) {
        let param = this.props.asm[functionNumber].params[paramNumber];
        param.value[lane] = _.min([parseInt(val, param.base), Math.pow(2, param.bitWidth - 1)]);
        this.forceUpdate();
    }

    randomizeRegister(functionNumber, paramNumber) {
        let param = this.props.asm[functionNumber].params[paramNumber];
        if (param.lanes === 1) {
            param.value = [_.random(1, Math.pow(2, _.min([8, param.bitWidth - 1])))];
        }
        else {
            param.value = new Array(param.lanes).fill(0).map(() => _.random(1, Math.pow(2, _.min([8, param.bitWidth - 1]))));
        }
    }

    buildContent() {
        let content = [];
        this.props.asm.forEach((func, i) => {
            content.push(
                <FunctionContainer key={i}>
                    <FunctionName>{func.name}</FunctionName>
                    <hr/>
                    {
                        func.params.map((param, j) => {
                            const paramBitLen = param.bitWidth * param.lanes;
                            const marks = this.getSliderMarks(paramBitLen);


                            return <ParameterContainer key={j}>
                                <Card>
                                    <CardBody>
                                        <CardTitle>
                                            {`Parameter ${j + 1}:`}&nbsp;&nbsp;
                                            <strong>{`${paramBitLen} bits`}</strong>
                                            <RandomizeButton onClick={() => {
                                                this.randomizeRegister(i, j);
                                                this.forceUpdate()
                                            }}>
                                                <i className="fas fa-dice"></i>
                                            </RandomizeButton>
                                        </CardTitle>
                                    </CardBody>
                                    <VectorContainer>
                                        <Row>
                                            {
                                                param.value.map((val, k) => (
                                                    <Col key={k}>
                                                        <input type="text"
                                                               value={val.toString(param.base)}
                                                               onChange={(e) => this.onVectorValueChange(e.target.value, i, j, k)}/>
                                                    </Col>
                                                ))
                                            }
                                        </Row>
                                    </VectorContainer>
                                    <CardBody>
                                        <Container>
                                            <Row>
                                                <ParameterOptionTitle xs="3" sm="2">Lane
                                                    Width: &nbsp;</ParameterOptionTitle>
                                                <Col>
                                                    <Slider style={{margin: "20px auto"}}
                                                            handleStyle={{
                                                                height: 20,
                                                                width: 20,
                                                                marginLeft: -10,
                                                                marginTop: -8,
                                                            }}
                                                            min={0}
                                                            defaultValue={+_.invert(marks)[param.bitWidth]}
                                                            marks={marks}
                                                            step={null}
                                                            onChange={(val) => this.onWidthChange(marks[val], i, j)}/>
                                                </Col>
                                            </Row>
                                            <Row>
                                                <ParameterOptionTitle xs="3" sm="2">Type: </ParameterOptionTitle>
                                                <Col>
                                                    <ButtonGroup>
                                                        <Button disabled
                                                                color="info"
                                                                onClick={() => this.onTypeChange('int', i, j)}
                                                                active={param.type === 'int'}>Integer</Button>
                                                        <Button disabled
                                                                color="info"
                                                                onClick={() => this.onTypeChange('float', i, j)}
                                                                active={param.type === 'float'}>Floating Point</Button>
                                                    </ButtonGroup>
                                                </Col>
                                            </Row>
                                            <Row>
                                                <ParameterOptionTitle xs="3" sm="2">Base: </ParameterOptionTitle>
                                                <Col>
                                                    <ButtonGroup>
                                                        <Button disabled
                                                                color="info"
                                                                onClick={() => this.onBaseChange(2, i, j)}
                                                                active={param.base === 2}>Binary</Button>
                                                        <Button color="info"
                                                                onClick={() => this.onBaseChange(10, i, j)}
                                                                active={param.base === 10}>Decimal</Button>
                                                        <Button color="info"
                                                                onClick={() => this.onBaseChange(16, i, j)}
                                                                active={param.base === 16}>Hexadecimal</Button>
                                                    </ButtonGroup>
                                                </Col>
                                            </Row>
                                        </Container>
                                    </CardBody>
                                </Card>
                            </ParameterContainer>
                        })
                    }
                </FunctionContainer>
            )
        });

        return content;
    }

    render() {
        return (
            <PageContainer>
                <Title>Choose your parameters</Title>
                {
                    this.buildContent()
                }
                <SubmitButton>
                    <Button outline color="primary" onClick={this.props.onComplete}>Let's go</Button>
                </SubmitButton>
            </PageContainer>
        )
    }
}