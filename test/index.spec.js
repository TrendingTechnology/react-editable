import PropTypes from 'prop-types';
import React from 'react';
import {expect} from 'chai';
import {shallow} from 'enzyme';
import {states} from '../src/state-machine';
import withCrud from '../src/index';

class MockComponent extends React.PureComponent {
  static propTypes = {
    testProp: PropTypes.number
  }

  render() {
    return <div />;
  }
}

const CrudMockComponent = withCrud(MockComponent);

describe('withCrud', () => {
  describe('smoke tests', () => {
    it('shouldn\'t fatal', () => {
      expect(() => <CrudMockComponent />).not.to.throw;
    });

    it('should render MockComponent', () => {
      expect(shallow(<CrudMockComponent />).is(MockComponent)).to.be.true;
    });
  });

  it('should hoist MockComponent props', () => {
    expect(CrudMockComponent.propTypes).to.have.property('testProp');
  });

  it('should pass through props to MockComponent', () => {
    expect(
      shallow(<CrudMockComponent testProp={1} />)
        .find(MockComponent)
        .props()
    ).to.include({
      testProp: 1,
      value: undefined,
      status: states.PRESENTING
    }).and.to.have.all.keys([
      'onStart', 'onCancel', 'onChange', 'onSubmit', 'onUpdate', 'onDelete', 'testProp'
    ]);
  });

  describe(`when status is ${states.PRESENTING}`, () => {
    it(`should transition to ${states.EDITING} when onChange is called`, () => {
      const wrapper = shallow(<CrudMockComponent value='propsValue' />);
      wrapper.find(MockComponent).prop('onChange')('newValue');
      expect(
        wrapper.find(MockComponent).props()
      ).to.include({
        status: states.EDITING,
        value: 'newValue'
      });
    });
  });

  describe(`when status is ${states.EDITING}`, () => {
    it('should update value when onChange is called', () => {
      const wrapper = shallow(<CrudMockComponent value='propsValue' />);
      wrapper
        .setState({
          status: states.EDITING,
          value: 'stateValue'
        })
        .find(MockComponent)
        .prop('onChange')('newValue');
      expect(
        wrapper.find(MockComponent).props()
      ).to.include({
        status: states.EDITING,
        value: 'newValue'
      });
    });

    it(`should transition to ${states.PRESENTING} when onSubmit is called without promise`, () => {
      const wrapper = shallow(<CrudMockComponent value='propsValue' onSubmit={() => {}} />);
      wrapper
        .setState({
          status: states.EDITING,
          value: 'stateValue'
        })
        .find(MockComponent)
        .prop('onSubmit')();
      expect(
        wrapper.find(MockComponent).props()
      ).to.include({
        status: states.PRESENTING,
        value: 'propsValue'
      });
    });

    it(`should transition to ${states.COMMITING} when onSubmit is called with promise`, () => {
      const wrapper = shallow(<CrudMockComponent value='propsValue' onSubmit={() => Promise.resolve()} />);
      wrapper
        .setState({
          status: states.EDITING,
          value: 'stateValue'
        })
        .find(MockComponent)
        .prop('onSubmit')();
      expect(
        wrapper.find(MockComponent).props()
      ).to.include({
        status: states.COMMITING,
        value: 'stateValue'
      });
    });
  });

  describe(`when status is ${states.COMMITING}`, () => {
    it(`should transition to ${states.PRESENTING} when promise resolves`, () => {
      const wrapper = shallow(<CrudMockComponent value='propsValue' onSubmit={() => Promise.resolve()} />);
      return wrapper
        .setState({
          status: states.EDITING,
          value: 'stateValue'
        })
        .find(MockComponent)
        .prop('onSubmit')()
        .then(() =>
          expect(
            wrapper.update().find(MockComponent).props()
          ).to.include({
            status: states.PRESENTING,
            value: 'propsValue'
          })
        );
    });

    it(`should transition to ${states.PRESENTING} when promise rejects`, () => {
      const wrapper = shallow(<CrudMockComponent value='propsValue' onSubmit={() => Promise.reject()} />);
      return wrapper
        .setState({
          status: states.EDITING,
          value: 'stateValue'
        })
        .find(MockComponent)
        .prop('onSubmit')()
        .then(() =>
          expect(
            wrapper.update().find(MockComponent).props()
          ).to.include({
            status: states.EDITING,
            value: 'stateValue'
          })
        );
    });
  });
});